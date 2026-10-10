import type { Movie } from '../data/catalog';
import {
  getSearchIntent,
  isDateNightFriendly,
  isFamilyFriendly,
  isQuickWatch,
} from './discovery';
import {
  isStrongCollectionMatch,
  normalizeSearchText,
  stripFranchiseSuffix,
} from './searchCatalog';

const SYNONYMS: Record<string, string[]> = {
  zombie: ['zombie', 'zombies', 'undead', 'infected', 'infection', 'outbreak', 'walker', 'walking', 'plague'],
  scifi: ['sci-fi', 'scifi', 'space', 'alien', 'extraterrestrial', 'futuristic', 'spaceship'],
  horror: ['horror', 'scary', 'frightening', 'terrifying', 'spooky', 'slasher', 'gore'],
  comedy: ['comedy', 'funny', 'hilarious', 'humor', 'parody', 'laugh', 'dark comedy'],
  monster: ['monster', 'monsters', 'creature', 'beast', 'kaiju'],
  vampire: ['vampire', 'vampires', 'dracula'],
  foundfootage: ['found footage', 'foundfootage', 'recording'],
  slasher: ['slasher', 'serial killer'],
};

function normalize(value: string) {
  return normalizeSearchText(value);
}

function compact(value: string) {
  return normalize(value).replace(/\s+/g, '');
}

interface SearchTerm {
  normalized: string;
  compact: string;
  typoTolerant: boolean;
}

function createSearchTerm(value: string): SearchTerm {
  const normalized = normalize(value);
  return {
    normalized,
    compact: normalized.replace(/\s+/g, ''),
    typoTolerant: !normalized.includes(' ') && normalized.length >= 5,
  };
}

const SEARCH_CONCEPTS = Object.entries(SYNONYMS).map(([key, synonyms]) => {
  const aliases = [key, ...synonyms].map(normalize);
  return {
    aliases,
    synonyms: synonyms.map(createSearchTerm),
  };
});

// Search only needs a one-edit threshold, not the complete distance. This
// linear scan preserves insertion/deletion/substitution behavior without a
// dynamic-programming allocation for every candidate word.
export function isEditDistanceAtMostOne(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let foundMismatch = false;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++;
      rightIndex++;
      continue;
    }

    if (foundMismatch) return false;
    foundMismatch = true;

    if (left.length > right.length) leftIndex++;
    else if (right.length > left.length) rightIndex++;
    else {
      leftIndex++;
      rightIndex++;
    }
  }

  return true;
}

interface MovieSearchIndex {
  descriptiveContent: string;
  descriptiveWords: string[];
  searchableContent: string;
  searchableWords: string[];
  collectionContent: string;
  collectionWords: string[];
  normalizedTitle: string;
  compactTitle: string;
  normalizedGenres: string;
  normalizedTags: string;
}

const movieSearchIndexCache = new WeakMap<Movie, MovieSearchIndex>();

function getMovieSearchIndex(movie: Movie): MovieSearchIndex {
  const cached = movieSearchIndexCache.get(movie);
  if (cached) return cached;

  const descriptiveContent = normalize([
    movie.title,
    movie.director,
    ...movie.cast,
    ...movie.genre,
    movie.description,
    ...movie.streamingPlatforms.map((platform) => platform.name),
    movie.collectionName ?? '',
    ...(movie.searchAliases ?? []),
  ].join(' '));
  const searchableContent = `${descriptiveContent} ${normalize(movie.tags.join(' '))}`;
  const collectionContent = normalize([
    movie.title,
    movie.collectionName ?? '',
    ...(movie.searchAliases ?? []),
  ].join(' '));
  const index: MovieSearchIndex = {
    descriptiveContent,
    descriptiveWords: descriptiveContent.split(' ').filter(Boolean),
    searchableContent,
    searchableWords: searchableContent.split(' ').filter(Boolean),
    collectionContent,
    collectionWords: collectionContent.split(' ').filter(Boolean),
    normalizedTitle: normalize(movie.title),
    compactTitle: compact(movie.title),
    normalizedGenres: normalize(movie.genre.join(' ')),
    normalizedTags: normalize(movie.tags.join(' ')),
  };
  movieSearchIndexCache.set(movie, index);
  return index;
}

function matchesTerm(content: string, term: SearchTerm, contentWords = content.split(' ').filter(Boolean)) {
  const normalizedTerm = term.normalized;
  if (!normalizedTerm) return true;
  if (content.includes(normalizedTerm)) return true;

  // People commonly omit punctuation and spaces in franchise names
  // ("spiderman", "xmen", "starwars"). Compare against short adjacent
  // word groups without flattening the entire synopsis into false matches.
  const compactTerm = term.compact;
  if (compactTerm.length >= 4) {
    for (let start = 0; start < contentWords.length; start++) {
      let adjacentWords = '';
      for (let length = 1; length <= 4 && start + length <= contentWords.length; length++) {
        adjacentWords += contentWords[start + length - 1];
        if (adjacentWords === compactTerm) return true;
        if (adjacentWords.length >= compactTerm.length) break;
      }
    }
  }

  // Typo tolerance is deliberately narrow so a search does not turn into a
  // loosely related content recommendation.
  if (term.typoTolerant) {
    return contentWords.some((word) => Math.abs(word.length - normalizedTerm.length) <= 1
      && isEditDistanceAtMostOne(word, normalizedTerm));
  }

  return false;
}

function getYearConstraint(query: string) {
  const explicitYear = query.match(/\b(19|20)\d{2}\b/)?.[0];
  if (explicitYear) {
    const year = Number(explicitYear);
    if (query.includes(`${year}s`)) return { start: year, end: year + 9 };
    if (year % 10 === 0 && query.includes(String(year))) return { start: year, end: year + 9 };
    return { start: year, end: year };
  }

  const shortDecade = query.match(/\b(\d{2})s\b/)?.[1];
  if (shortDecade) {
    const value = Number(shortDecade);
    const start = value >= 30 ? 1900 + value : 2000 + value;
    return { start, end: start + 9 };
  }

  return null;
}

function getIntentTerms(intent: ReturnType<typeof getSearchIntent>) {
  const genericMovieTerms = ['movie', 'movies', 'film', 'films', 'pick', 'picks'];
  if (intent === 'family') return new Set(['family', 'families', 'kids', 'children', 'child', 'friendly', 'night', ...genericMovieTerms]);
  if (intent === 'date-night') return new Set(['date', 'night', 'romance', 'romantic', 'love', 'story', 'couple', 'couples', ...genericMovieTerms]);
  if (intent === 'quick-watch') return new Set(['quick', 'short', 'under', 'hours', 'hour', 'minute', 'minutes', ...genericMovieTerms]);
  return new Set<string>();
}

function getSearchRelevance(
  movie: Movie,
  index: MovieSearchIndex,
  normalizedQuery: string,
  compactQuery: string,
  intent: ReturnType<typeof getSearchIntent>,
) {
  const normalizedTitle = index.normalizedTitle;
  const compactTitle = index.compactTitle;
  const normalizedGenres = index.normalizedGenres;
  const normalizedTags = index.normalizedTags;
  const collectionAliases = [movie.collectionName ?? '', ...(movie.searchAliases ?? [])].filter(Boolean);
  let relevance = movie.score;

  if (normalizedTitle === normalizedQuery || compactTitle === compactQuery) relevance += 100;
  else if (normalizedTitle.includes(normalizedQuery) || compactTitle.includes(compactQuery)) relevance += 60;
  if (normalizedGenres.includes(normalizedQuery)) relevance += 24;
  if (normalizedTags.includes(normalizedQuery)) relevance += 18;
  if (collectionAliases.some((alias) => isStrongCollectionMatch(normalizedQuery, alias))) relevance += 80;
  if (intent === 'family' && isFamilyFriendly(movie)) relevance += 30;
  if (intent === 'date-night' && isDateNightFriendly(movie)) relevance += 30;
  if (intent === 'quick-watch' && isQuickWatch(movie)) relevance += 30;

  return relevance;
}

export function smartSearchMovies(movies: Movie[], query: string): Movie[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return movies;

  const searchIntent = getSearchIntent(normalizedQuery);
  const intentTerms = getIntentTerms(searchIntent);
  const yearConstraint = getYearConstraint(normalizedQuery);
  // Franchise suffixes describe the requested shape, not a required word in
  // every title. Keep singular "movie" intact so titles such as "Scary
  // Movie" still match, while "Harry Potter movies" behaves like the
  // franchise query "Harry Potter".
  const textQuery = stripFranchiseSuffix(normalizedQuery)
    .replace(/\b(19|20)\d{2}s?\b/g, '')
    .replace(/\b\d{2}s\b/g, '')
    .trim();
  const queryTerms = textQuery.split(' ').filter((term) => term && !intentTerms.has(term));
  const querySearchTerms = queryTerms.map(createSearchTerm);
  const textSearchTerm = createSearchTerm(textQuery);

  const normalizedQueryWords = new Set(normalizedQuery.split(' '));
  const matchedConcepts = SEARCH_CONCEPTS
    .filter(({ aliases }) => aliases.some((normalizedTerm) => {
      return normalizedQuery === normalizedTerm
        || normalizedQueryWords.has(normalizedTerm)
        || (normalizedTerm.includes(' ') && normalizedQuery.includes(normalizedTerm));
    }));
  const conceptTokens = new Set(
    matchedConcepts.flatMap(({ aliases }) => aliases.flatMap((alias) => alias.split(' '))),
  );
  const remainingTerms = querySearchTerms.filter((term) => !conceptTokens.has(term.normalized));
  const hasStrongCollectionContext = queryTerms.length >= 2 && movies.some((movie) =>
    [movie.collectionName ?? '', ...(movie.searchAliases ?? [])]
      .some((alias) => alias && isStrongCollectionMatch(textQuery, alias)));

  const matches = movies.filter((movie) => {
    if (yearConstraint && (movie.year < yearConstraint.start || movie.year > yearConstraint.end)) return false;
    if (searchIntent === 'family' && !isFamilyFriendly(movie)) return false;
    if (searchIntent === 'date-night' && !isDateNightFriendly(movie)) return false;
    if (searchIntent === 'quick-watch' && !isQuickWatch(movie)) return false;
    if (queryTerms.length === 0) return true;

    const index = getMovieSearchIndex(movie);

    if (hasStrongCollectionContext) {
      if (!matchesTerm(index.collectionContent, textSearchTerm, index.collectionWords)) return false;
    }

    const directMatch = querySearchTerms.every((term) => matchesTerm(index.searchableContent, term, index.searchableWords));
    if (matchedConcepts.length === 0) return directMatch;

    const conceptMatch = matchedConcepts.every(({ synonyms }) =>
      synonyms.some((synonym) => matchesTerm(index.descriptiveContent, synonym, index.descriptiveWords)));
    return conceptMatch
      && remainingTerms.every((term) => matchesTerm(index.descriptiveContent, term, index.descriptiveWords));
  });

  const relevanceQuery = stripFranchiseSuffix(normalizedQuery);
  const compactRelevanceQuery = compact(relevanceQuery);
  const relevanceByMovie = new Map(matches.map((movie) => [
    movie,
    getSearchRelevance(
      movie,
      getMovieSearchIndex(movie),
      relevanceQuery,
      compactRelevanceQuery,
      searchIntent,
    ),
  ]));

  return matches.sort((left, right) => {
    if (hasStrongCollectionContext
      && left.collectionId
      && left.collectionId === right.collectionId
      && left.collectionPartPosition
      && right.collectionPartPosition) {
      return left.collectionPartPosition - right.collectionPartPosition;
    }
    return relevanceByMovie.get(right)! - relevanceByMovie.get(left)!;
  });
}

import type { Movie } from '../data/catalog';
import {
  getSearchIntent,
  isDateNightFriendly,
  isFamilyFriendly,
  isQuickWatch,
} from './discovery';

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
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function editDistance(left: string, right: string) {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    let diagonal = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const previous = row[rightIndex];
      row[rightIndex] = Math.min(
        row[rightIndex] + 1,
        row[rightIndex - 1] + 1,
        diagonal + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = previous;
    }
  }

  return row[right.length];
}

function matchesTerm(content: string, term: string) {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return true;
  if (content.includes(normalizedTerm)) return true;

  // Typo tolerance is deliberately narrow so a search does not turn into a
  // loosely related content recommendation.
  if (!normalizedTerm.includes(' ') && normalizedTerm.length >= 5) {
    return content.split(' ').some((word) => Math.abs(word.length - normalizedTerm.length) <= 1
      && editDistance(word, normalizedTerm) <= 1);
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

function getSearchRelevance(movie: Movie, query: string, intent: ReturnType<typeof getSearchIntent>) {
  const normalizedQuery = normalize(query);
  const normalizedTitle = normalize(movie.title);
  const normalizedGenres = normalize(movie.genre.join(' '));
  const normalizedTags = normalize(movie.tags.join(' '));
  let relevance = movie.score;

  if (normalizedTitle === normalizedQuery) relevance += 100;
  else if (normalizedTitle.includes(normalizedQuery)) relevance += 60;
  if (normalizedGenres.includes(normalizedQuery)) relevance += 24;
  if (normalizedTags.includes(normalizedQuery)) relevance += 18;
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
  const textQuery = normalizedQuery
    .replace(/\b(19|20)\d{2}s?\b/g, '')
    .replace(/\b\d{2}s\b/g, '')
    .trim();
  const queryTerms = textQuery.split(' ').filter((term) => term && !intentTerms.has(term));

  const matchedConcepts = Object.entries(SYNONYMS)
    .filter(([key, synonyms]) => [key, ...synonyms].some((term) => {
      const normalizedTerm = normalize(term);
      return normalizedQuery === normalizedTerm
        || normalizedQuery.split(' ').includes(normalizedTerm)
        || (normalizedTerm.includes(' ') && normalizedQuery.includes(normalizedTerm));
    }))
    .map(([key, synonyms]) => ({ aliases: [key, ...synonyms], synonyms }));
  const conceptTokens = new Set(
    matchedConcepts.flatMap(({ aliases }) => aliases.flatMap((alias) => normalize(alias).split(' '))),
  );
  const remainingTerms = queryTerms.filter((term) => !conceptTokens.has(term));

  const matches = movies.filter((movie) => {
    if (yearConstraint && (movie.year < yearConstraint.start || movie.year > yearConstraint.end)) return false;
    if (searchIntent === 'family' && !isFamilyFriendly(movie)) return false;
    if (searchIntent === 'date-night' && !isDateNightFriendly(movie)) return false;
    if (searchIntent === 'quick-watch' && !isQuickWatch(movie)) return false;
    if (queryTerms.length === 0) return true;

    const descriptiveContent = normalize([
      movie.title,
      movie.director,
      ...movie.cast,
      ...movie.genre,
      movie.description,
      ...movie.streamingPlatforms.map((platform) => platform.name),
    ].join(' '));
    const searchableContent = `${descriptiveContent} ${normalize(movie.tags.join(' '))}`;

    const directMatch = queryTerms.every((term) => matchesTerm(searchableContent, term));
    if (matchedConcepts.length === 0) return directMatch;

    const conceptMatch = matchedConcepts.every(({ synonyms }) =>
      synonyms.some((synonym) => matchesTerm(descriptiveContent, synonym)));
    return conceptMatch
      && remainingTerms.every((term) => matchesTerm(descriptiveContent, term));
  });

  return matches.sort((left, right) =>
    getSearchRelevance(right, normalizedQuery, searchIntent)
    - getSearchRelevance(left, normalizedQuery, searchIntent),
  );
}

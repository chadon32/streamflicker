import type { Movie } from '../data/catalog';
import { getTMDBImageSrcSet } from './images';

/** The hero's movies: reviewed titles flagged featured or trending, else the first reviewed title. */
export function getSpotlightMovies(reviewed: readonly Movie[]): Movie[] {
  const featured = reviewed.filter((movie) => movie.featured || movie.trending);
  return featured.length > 0 ? featured : reviewed.slice(0, 1);
}

/**
 * The hero backdrop's image attributes. The home page's HTML preloads exactly these, so the browser starts the
 * download before the JavaScript has rendered the hero and then reuses it.
 */
export function getHeroImage(movie: Pick<Movie, 'backdropUrl'>) {
  return {
    src: movie.backdropUrl,
    srcSet: getTMDBImageSrcSet(movie.backdropUrl, [500, 780, 1280]),
    sizes: '100vw',
  };
}

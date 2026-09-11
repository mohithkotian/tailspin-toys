import { eq, asc, and, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function normalizeFilterValues(value: number | number[] | null | undefined): number[] {
    if (value === null || value === undefined) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter((id) => Number.isInteger(id) && id > 0);
    }

    return Number.isInteger(value) && value > 0 ? [value] : [];
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Optional filters for narrowing the catalog to a subset of games.
 * Use either a single value or a set of IDs to target one or more categories or publishers.
 */
export interface GameFilters {
    /** Include only games in one or more category IDs. */
    categoryId?: number | number[] | null;
    /** Include only games in one or more category IDs. */
    categoryIds?: number[] | null;
    /** Include only games published by one or more publisher IDs. */
    publisherId?: number | number[] | null;
    /** Include only games published by one or more publisher IDs. */
    publisherIds?: number[] | null;
}

/**
 * Return all games in title order, optionally restricted to one or more category and/or publisher selections.
 *
 * @param db Injected database connection used to read the catalog.
 * @param filters Optional category and publisher ID filters applied together with AND logic.
 * @returns Games ordered alphabetically by title with their related category and publisher data.
 */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const categoryIds = normalizeFilterValues(filters.categoryId ?? filters.categoryIds);
    const publisherIds = normalizeFilterValues(filters.publisherId ?? filters.publisherIds);
    const conditions = [];

    if (categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherIds.length > 0) {
        conditions.push(inArray(games.publisherId, publisherIds));
    }

    const query = conditions.length > 0 ? baseGamesQuery(db).where(and(...conditions)) : baseGamesQuery(db);
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Return every category sorted alphabetically by its display name.
 *
 * @param db Injected database connection used to read category metadata.
 * @returns Categories ordered by name.
 */
export async function getAllCategories(db: Database): Promise<Array<{ id: number; name: string }>> {
    return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name));
}

/**
 * Return every publisher sorted alphabetically by its display name.
 *
 * @param db Injected database connection used to read publisher metadata.
 * @returns Publishers ordered by name.
 */
export async function getAllPublishers(db: Database): Promise<Array<{ id: number; name: string }>> {
    return db.select({ id: publishers.id, name: publishers.name }).from(publishers).orderBy(asc(publishers.name));
}

/**
 * Return all game IDs ordered by title.
 *
 * @param db Injected database connection used to read the catalog.
 * @returns The ordered list of game IDs.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Return one game by ID, or null when no game matches.
 *
 * @param db Injected database connection used to fetch the game record.
 * @param id The unique game ID to look up.
 * @returns The matching game with its related category and publisher, or null.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

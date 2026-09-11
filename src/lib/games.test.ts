import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllCategories,
    getAllGames,
    getAllGameIds,
    getAllPublishers,
    getGameById,
    getGamesPage,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns the requested page and pagination metadata', async () => {
        await seedGames(db, 7);

        const page = await getGamesPage(db, { page: 2, pageSize: 3 });

        expect(page.totalGames).toBe(7);
        expect(page.totalPages).toBe(3);
        expect(page.page).toBe(2);
        expect(page.games.map((game) => game.title)).toEqual(['Game 04', 'Game 05', 'Game 06']);
    });

    it('normalizes invalid page values and clamps pages past the end', async () => {
        await seedGames(db, 2);

        const page = await getGamesPage(db, { page: 99, pageSize: 3 });

        expect(page.page).toBe(1);
        expect(page.totalPages).toBe(1);
        expect(page.games).toHaveLength(2);
    });

    it('filters games by category and publisher', async () => {
        const [strategy] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'cat' })
            .returning({ id: categories.id });
        const [puzzle] = await db
            .insert(categories)
            .values({ name: 'Puzzle', description: 'cat' })
            .returning({ id: categories.id });
        const [pubOne] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'pub' })
            .returning({ id: publishers.id });
        const [pubTwo] = await db
            .insert(publishers)
            .values({ name: 'Pub Two', description: 'pub' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            { title: 'Alpha', description: 'A', starRating: 4.4, categoryId: strategy.id, publisherId: pubOne.id },
            { title: 'Bravo', description: 'B', starRating: 4.2, categoryId: strategy.id, publisherId: pubTwo.id },
            { title: 'Charlie', description: 'C', starRating: 4.3, categoryId: puzzle.id, publisherId: pubOne.id },
        ]);

        const filtered = await getAllGames(db, {
            categoryId: strategy.id,
            publisherId: pubOne.id,
        });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha']);
        expect(filtered[0].category).toEqual({ id: strategy.id, name: 'Strategy' });
        expect(filtered[0].publisher).toEqual({ id: pubOne.id, name: 'Pub One' });
    });

    it('returns categories and publishers in alphabetical order', async () => {
        await db.insert(categories).values([
            { name: 'Strategy', description: 's' },
            { name: 'Puzzle', description: 'p' },
        ]);
        await db.insert(publishers).values([
            { name: 'Pub Two', description: 't' },
            { name: 'Pub One', description: 'o' },
        ]);

        await expect(getAllCategories(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Puzzle' },
            { id: expect.any(Number), name: 'Strategy' },
        ]);
        await expect(getAllPublishers(db)).resolves.toEqual([
            { id: expect.any(Number), name: 'Pub One' },
            { id: expect.any(Number), name: 'Pub Two' },
        ]);
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });
});

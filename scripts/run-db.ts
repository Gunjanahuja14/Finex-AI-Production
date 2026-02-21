import { db } from '../src/services/db';

(async () => {
  console.log('Running db.ts standalone demonstration...');
  await db.initialize();
  await db.add({ amount: 12.34, category: 'food', item: 'lunch', vendor: null, date: new Date().toISOString() });
  console.log('All transactions:', await db.getAll());
  console.log('Snapshot:', await db.getAISnapshot());
})().catch(err => {
  console.error('Error in standalone run:', err);
});
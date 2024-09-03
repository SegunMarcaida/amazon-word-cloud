import Database from "better-sqlite3";


const db = new Database('./data/database.db');


export const startDB = () => {
    db.exec("CREATE TABLE IF NOT EXISTS processed_urls (id INTEGER PRIMARY KEY AUTOINCREMENT , url TEXT UNIQUE, processed_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    db.exec("CREATE TABLE IF NOT EXISTS word_frequencies ( id INTEGER PRIMARY KEY AUTOINCREMENT , word TEXT UNIQUE ,frequency INTEGER)");
}
export default db;

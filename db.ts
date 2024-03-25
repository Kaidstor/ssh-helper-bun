import { JSONFilePreset } from "lowdb/node";

// Read or create db.json
const defaultData = {
  ports: {} as Record<string, number>,
};

const db = await JSONFilePreset("db.json", defaultData);

export default db;

import dotenv from 'dotenv';
dotenv.config();
import Pocketbase from 'pocketbase';

const pocketbaseUrl = process.env.POCKETBASE_URL || 'http://localhost:8090';

const pocketbaseClient = new Pocketbase(pocketbaseUrl);

await pocketbaseClient.collection('_superusers').authWithPassword(
    process.env.PB_SUPERUSER_EMAIL,
    process.env.PB_SUPERUSER_PASSWORD,
);

export default pocketbaseClient;

export { pocketbaseClient };

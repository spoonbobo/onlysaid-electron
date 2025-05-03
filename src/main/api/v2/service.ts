import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const ONLYSAID_API_URL = process.env.ONLYSAID_API_URL

const onlysaidServiceInstance = axios.create({
  baseURL: ONLYSAID_API_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

export default onlysaidServiceInstance;
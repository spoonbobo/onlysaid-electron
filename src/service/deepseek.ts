import axios from "axios";

export class DeepSeekAPIService {
  private readonly baseURL: string;


  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async Authenticate(apiKey: string): Promise<boolean> {
    const response = await axios.get(`${this.baseURL}/user/balance`, { headers: { Authorization: `Bearer ${apiKey}` } });
    return response.data.is_available;
  }
}
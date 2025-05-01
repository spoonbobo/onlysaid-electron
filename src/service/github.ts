export const GithubService = {
    async getUser() {
        const response = await fetch('https://api.github.com/user');
        return response.json();
    }
}
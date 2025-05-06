import { GitHub } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";
interface GitHubServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const GitHubServer = ({ onConfigure, onReset }: GitHubServerProps) => {
    const { gitHubEnabled, setGitHubEnabled, isGitHubConfigured } = useMCPStore();
    const isConfigured = isGitHubConfigured();

    return (
        <ServerCard
            title="GitHub MCP Server (Docker Required)"
            description="MCP server for GitHub repository management and code access."
            version="0.2.1"
            isEnabled={gitHubEnabled}
            isConfigured={isConfigured}
            onToggle={setGitHubEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<GitHub />}
            sourceUrl="https://github.com/github/github-mcp-server"
        />
    );
};

export default withReset(GitHubServer, "github");
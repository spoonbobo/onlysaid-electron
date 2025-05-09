import { Search } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface TavilyServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const TavilyServer = ({ onConfigure, onReset }: TavilyServerProps) => {
    const { tavilyEnabled, setTavilyEnabled, isTavilyConfigured } = useMCPStore();
    const isConfigured = isTavilyConfigured();

    return (
        <ServerCard
            title="Tavily Web Search MCP Server"
            description="MCP server for Tavily AI-powered web search integration."
            version="unknown"
            isEnabled={tavilyEnabled}
            isConfigured={isConfigured}
            onToggle={setTavilyEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<Search />}
            sourceUrl="https://github.com/tavily-ai/tavily-mcp"
        />
    );
};

export default withReset(TavilyServer, "tavily");

import { LinkedIn } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface LinkedInServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const LinkedInServer = ({ onConfigure, onReset }: LinkedInServerProps) => {
    const { linkedInEnabled, setLinkedInEnabled, isLinkedInConfigured } = useMCPStore();
    const isConfigured = isLinkedInConfigured();

    return (
        <ServerCard
            title="LinkedIn MCP Server"
            description="MCP server for LinkedIn professional network integration."
            version="1.0.0"
            isEnabled={linkedInEnabled}
            isConfigured={isConfigured}
            onToggle={setLinkedInEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<LinkedIn />}
            sourceUrl="https://github.com/adhikasp/mcp-linkedin"
        />
    );
};

export default withReset(LinkedInServer, "linkedin");

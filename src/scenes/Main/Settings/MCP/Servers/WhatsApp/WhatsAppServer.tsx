import { WhatsApp } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface WhatsAppServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const WhatsAppServer = ({ onConfigure, onReset }: WhatsAppServerProps) => {
    const { whatsAppEnabled, setWhatsAppEnabled, isWhatsAppConfigured } = useMCPStore();
    const isConfigured = isWhatsAppConfigured();

    return (
        <ServerCard
            title="WhatsApp MCP Server (Only on Linux)"
            description="MCP server for WhatsApp messaging integration."
            version="0.0.1"
            isEnabled={whatsAppEnabled}
            isConfigured={isConfigured}
            onToggle={setWhatsAppEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<WhatsApp />}
            sourceUrl="https://github.com/lharries/whatsapp-mcp?tab=readme-ov-file#installation"
        />
    );
};

export default withReset(WhatsAppServer, "whatsapp");
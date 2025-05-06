import { Wallet } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface Web3ResearchServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const Web3ResearchServer = ({ onConfigure, onReset }: Web3ResearchServerProps) => {
    const { web3ResearchEnabled, setWeb3ResearchEnabled, isWeb3ResearchConfigured } = useMCPStore();
    const isConfigured = isWeb3ResearchConfigured();

    return (
        <ServerCard
            title="Web3 Research MCP"
            description="MCP server for Web3 and blockchain research capabilities."
            version="0.9.0"
            isEnabled={web3ResearchEnabled}
            isConfigured={isConfigured}
            onToggle={setWeb3ResearchEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<Wallet />}
        />
    );
};

export default withReset(Web3ResearchServer, "web3-research");
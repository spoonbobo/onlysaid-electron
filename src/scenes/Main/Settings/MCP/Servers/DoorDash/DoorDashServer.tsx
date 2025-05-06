import { DeliveryDining } from "@mui/icons-material";
import ServerCard from "../ServerCard";
import { useMCPStore } from "@/stores/MCP/MCPStore";
import withReset from "../withReset";

interface DoorDashServerProps {
    onConfigure: () => void;
    onReset?: () => void;
}

const DoorDashServer = ({ onConfigure, onReset }: DoorDashServerProps) => {
    const { doorDashEnabled, setDoorDashEnabled, isDoorDashConfigured } = useMCPStore();
    const isConfigured = isDoorDashConfigured();

    return (
        <ServerCard
            title="DoorDash MCP Server"
            description="MCP server for food delivery integration with DoorDash."
            version="1.1.0"
            isEnabled={doorDashEnabled}
            isConfigured={isConfigured}
            onToggle={setDoorDashEnabled}
            onConfigure={onConfigure}
            onReset={onReset}
            icon={<DeliveryDining />}
        />
    );
};

export default withReset(DoorDashServer, "doordash");
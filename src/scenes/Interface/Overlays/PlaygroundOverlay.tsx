import { Button } from "@mui/material";
import { useTopicStore } from "@/stores/Topic/TopicStore";

const PlaygroundOverlay = () => {
    const { selectedContext, setSelectedContext } = useTopicStore();

    const isPlaygroundActive = selectedContext?.type === "playground";

    const handleTogglePlayground = () => {
        if (isPlaygroundActive) {
            // Switch back to home if playground is currently active
            setSelectedContext({ name: "home", type: "home" });
        } else {
            // Switch to playground
            setSelectedContext({ name: "playground", type: "playground" });
        }
    };

    return (
        <Button
            variant="text"
            color={isPlaygroundActive ? "error" : "primary"}
            size="small"
            onClick={handleTogglePlayground}
            fullWidth
            sx={{
                background: 'transparent',
                '&:hover': {
                    background: 'rgba(0,0,0,0.03)'
                }
            }}
        >
            {isPlaygroundActive ? "Close Playground" : "Open Playground"}
        </Button>
    );
};

export default PlaygroundOverlay;
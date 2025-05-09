import { Box, Typography, Paper } from "@mui/material";
import { useTopicStore } from "@/stores/Topic/TopicStore";
import { useEffect, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

const Playground = () => {
    const { selectedContext } = useTopicStore();
    const [fileContent, setFileContent] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const loadFileContent = async () => {
            setLoading(true);
            try {
                const content = await window.electron.fileSystem.getFileContent("/home/spoonbobo/onlysaid/onlysaid-electron/src/components/Debug/index.tsx");
                setFileContent(content);
            } catch (error) {
                console.error("Failed to load file content:", error);
                setFileContent("// Error loading filesystem.ts content");
            } finally {
                setLoading(false);
            }
        };

        loadFileContent();
    }, []);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>Playground</Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
                {/* Left side - Source Code */}
                <Box sx={{ width: '40%' }}>
                    <Typography variant="h6" gutterBottom>Source Code</Typography>
                    <Paper
                        elevation={3}
                        sx={{
                            height: "80vh",
                            overflow: "auto",
                            mt: 2,
                            fontFamily: "monospace"
                        }}
                    >
                        {loading ? (
                            <Box sx={{ p: 2 }}>Loading file content...</Box>
                        ) : (
                            <SyntaxHighlighter
                                language="typescript"
                                style={vs2015}
                                customStyle={{ margin: 0, borderRadius: 4 }}
                                showLineNumbers={true}
                            >
                                {fileContent}
                            </SyntaxHighlighter>
                        )}
                    </Paper>
                </Box>

                {/* Right side - Content */}
                <Box sx={{ width: '60%' }}>
                    <Typography variant="h6" gutterBottom>Content</Typography>
                    <Paper
                        elevation={3}
                        sx={{
                            height: "80vh",
                            overflow: "auto",
                            mt: 2,
                            p: 2
                        }}
                    >
                        <Typography variant="body1" gutterBottom>
                            Currently selected context: {selectedContext?.name} ({selectedContext?.type})
                        </Typography>

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="body2">
                                This area can display additional information related to the selected context or file.
                            </Typography>
                        </Box>
                    </Paper>
                </Box>
            </Box>
        </Box>
    );
};

export default Playground;

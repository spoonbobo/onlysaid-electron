import { Box, Typography } from "@mui/material";
import { useRef, useEffect } from "react";
import { IChatMessage } from "@/models/Chat/Message";


interface ChatUIProps {
  messages: IChatMessage[];
}

function ChatUI({ messages }: ChatUIProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Box sx={{ flex: 1, overflowY: "auto", px: 3, py: 2 }}>
      {messages.map((msg) => (
        <Box key={msg.id} sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "text.primary" }}>
            {msg.sender}
            <Typography component="span" sx={{ color: "text.secondary", fontWeight: 400, fontSize: "0.8rem", ml: 1 }}>
              {msg.created_at}
            </Typography>
          </Typography>
          <Typography sx={{ color: "text.secondary", fontSize: "0.95rem", mt: 0.5, whiteSpace: "pre-line" }}>
            {msg.text}
          </Typography>
        </Box>
      ))}
      <div ref={messagesEndRef} />
    </Box>
  );
}

export default ChatUI;

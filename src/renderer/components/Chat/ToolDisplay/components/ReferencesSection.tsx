import { Box, Typography } from "@mui/material";
import { memo } from 'react';
import { formatUrlForDisplay } from "@/utils/url";

interface ReferencesSectionProps {
  references: string[];
}

export const ReferencesSection = memo(({ references }: ReferencesSectionProps) => {
  if (references.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography
        variant="caption"
        component="div"
        sx={{
          fontWeight: 'medium',
          mb: 0.5,
          color: 'text.secondary',
          opacity: 0.8
        }}
      >
        References ({references.length}):
      </Typography>
      <Box sx={{ pl: 1 }}>
        {references.map((url, index) => (
          <Typography
            key={index}
            variant="caption"
            component="div"
            sx={{ mb: 0.25 }}
          >
            <Typography
              component="span"
              onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              sx={{
                cursor: 'pointer',
                color: 'text.secondary',
                opacity: 0.7,
                fontSize: '0.7rem',
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                  opacity: 0.9,
                },
                wordBreak: 'break-all',
              }}
            >
              • {formatUrlForDisplay(url, 70)}
            </Typography>
          </Typography>
        ))}
      </Box>
    </Box>
  );
}); 
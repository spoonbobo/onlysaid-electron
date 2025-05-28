import { Box, Typography } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import { FormattedMessage } from "react-intl";

interface DefaultProps {
  section?: string;
}

function Default({ section }: DefaultProps) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        p: 3
      }}
    >
      <ConstructionIcon
        sx={{
          fontSize: 64,
          color: "text.secondary",
          mb: 2
        }}
      />
      <Typography variant="h5" gutterBottom color="text.primary">
        <FormattedMessage id="default.stillImplementing" />
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center">
        {section ? (
          <FormattedMessage
            id="default.sectionUnderDevelopment"
            values={{ section }}
          />
        ) : (
          <FormattedMessage id="default.featureUnderDevelopment" />
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }} textAlign="center">
        <FormattedMessage id="default.checkBackLater" />
      </Typography>
    </Box>
  );
}

export default Default;

import { Typography, TextField, Button } from "@mui/material";
import SettingsSection from "../../../../../components/Settings/SettingsSection";
import SettingsFormField from "../../../../../components/Settings/SettingsFormField";
import SettingsActionBar from "../../../../../components/Settings/SettingsActionBar";

function DeleteAccount() {
  return (
    <SettingsSection title="Delete Account" titleColor="error.main">
      <Typography sx={{ mb: 3 }}>
        Warning: This action cannot be undone. All your data will be permanently deleted.
      </Typography>

      <SettingsFormField label='Please type "DELETE" to confirm'>
        <TextField fullWidth size="small" placeholder="DELETE" />
      </SettingsFormField>

      <SettingsFormField label="Enter your password to confirm">
        <TextField fullWidth size="small" type="password" />
      </SettingsFormField>

      <SettingsActionBar>
        <Button variant="contained" color="error">Permanently Delete Account</Button>
      </SettingsActionBar>
    </SettingsSection>
  );
}

export default DeleteAccount;

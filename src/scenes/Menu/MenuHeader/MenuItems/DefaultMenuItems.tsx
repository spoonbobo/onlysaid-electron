import { MenuItem } from "@mui/material";
import { FormattedMessage } from "react-intl";
import HelpIcon from "@mui/icons-material/Help";

type DefaultMenuItemsProps = {
    handleClose: () => void;
};

function DefaultMenuItems({ handleClose }: DefaultMenuItemsProps) {
    return (
        <MenuItem onClick={handleClose} sx={{ minHeight: 36, fontSize: 14 }}>
            <HelpIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
            <FormattedMessage id="menu.options" />
        </MenuItem>
    );
}

export default DefaultMenuItems;
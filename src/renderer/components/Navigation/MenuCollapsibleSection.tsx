import { Collapse, List, SxProps, Theme } from "@mui/material";
import { ReactNode } from "react";

type MenuCollapsibleSectionProps = {
  isOpen: boolean;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

export default function MenuCollapsibleSection({
  isOpen,
  children,
  sx
}: MenuCollapsibleSectionProps) {
  return (
    <Collapse in={isOpen} timeout="auto" unmountOnExit>
      <List component="div" disablePadding dense sx={sx}>
        {children}
      </List>
    </Collapse>
  );
}
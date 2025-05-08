import { useRef, useEffect, useState } from "react";
import { Box, Typography, Button, List, ListItem, ListItemIcon, ListItemText, CircularProgress, Menu, MenuItem } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MenuListItem from "@/components/Navigation/MenuListItem";
import MenuSection from "@/components/Navigation/MenuSection";
import { useFileExplorerStore } from "@/stores/Layout/FileExplorerResize";
import { useFileExplorerStore as useFilesStore, selectors } from "@/stores/File/FileExplorerStore";
import { FormattedMessage } from "react-intl";
import FileDropDialog from "@/components/Dialog/File";
import FileClickDialog from "@/components/Dialog/File/FileClickDialog";

// Define props interface
interface FileExplorerProps {
    minContentHeightAbove: number;
}

function FileNodeItem({ node, level = 0 }: { node: any, level?: number }) {
    const { loadFolder, toggleFolder, selectItem, removeRootFolder, selectedPath } = useFilesStore();
    const isLoading = useFilesStore(selectors.selectIsNodeLoading(node.path));
    const [isDragging, setIsDragging] = useState(false);
    // Add state for context menu
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchorEl);

    // Add state for dialogs
    const [showFileDropDialog, setShowFileDropDialog] = useState(false);
    const [showFileClickDialog, setShowFileClickDialog] = useState(false);
    const [draggedPath, setDraggedPath] = useState("");

    const isRootFile = level === 0 && node.type === 'file';
    const isSelected = selectedPath === node.path;
    const isLeafFile = level > 0 && node.type === 'file'; // Add check for leaf file

    // Make all files draggable, not just root files
    const isDraggable = node.type === 'file';

    const handleClick = () => {
        if (isLoading) return;

        if (node.type === 'directory') {
            if (node.isExpanded || node.children?.length > 0) {
                toggleFolder(node.path);
            } else if (!node.isExpanded && !node.children) {
                loadFolder(node.path);
            } else if (!node.isExpanded && node.children?.length === 0) {
                loadFolder(node.path);
            }
        } else {
            selectItem(node.path);

            // Show dialog when clicking on a leaf file
            if (isLeafFile) {
                setShowFileClickDialog(true);
            }
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable) return;

        setIsDragging(true);
        e.dataTransfer.setData('text/plain', node.path);
        if (e.dataTransfer.setDragImage && e.currentTarget) {
            e.dataTransfer.setDragImage(e.currentTarget, 0, 0);
        }
        if (e.currentTarget) {
            e.currentTarget.style.opacity = '0.4';
        }
    };

    const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
        if (!isDraggable) return;

        setIsDragging(false);
        if (e.currentTarget) {
            e.currentTarget.style.opacity = '1';
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const draggedNodePath = e.dataTransfer.getData('text/plain');
        console.log(`Dropped ${draggedNodePath} onto ${node.path}`);

        // Show file drop dialog
        setDraggedPath(draggedNodePath);
        setShowFileDropDialog(true);
    };

    // Add context menu handler
    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        if (level === 0) { // Only show context menu for root level items
            e.preventDefault();
            e.stopPropagation();
            setMenuAnchorEl(e.currentTarget);
        }
    };

    const handleCloseMenu = () => {
        setMenuAnchorEl(null);
    };

    const handleRemoveFolder = () => {
        removeRootFolder(node.path);
        handleCloseMenu();
    };

    return (
        <div>
            <ListItem
                component="div"
                onClick={handleClick}
                onContextMenu={handleContextMenu}
                draggable={isDraggable}
                onDragStart={isDraggable ? handleDragStart : undefined}
                onDragEnd={isDraggable ? handleDragEnd : undefined}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                sx={{
                    pl: 2 + level * 2,
                    py: 0.5,
                    cursor: isLoading ? 'default' : (isDraggable ? 'grab' : 'pointer'),
                    opacity: isLoading ? 0.7 : (isDragging ? 0.4 : 1),
                    bgcolor: isSelected ? 'action.selected' : 'transparent',
                    '&:hover': { bgcolor: isLoading ? 'transparent' : (isSelected ? 'action.selected' : 'action.hover') },
                    height: 36,
                    minHeight: 36,
                    boxSizing: 'border-box',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                }}
            >
                <ListItemIcon sx={{ minWidth: 36 }}>
                    {node.type === 'directory' ? (
                        isLoading ? (
                            <CircularProgress size={20} color="inherit" />
                        ) : node.isExpanded ? (
                            <FolderOpenIcon fontSize="small" color="primary" />
                        ) : (
                            <FolderIcon fontSize="small" color="primary" />
                        )
                    ) : (
                        <InsertDriveFileIcon fontSize="small" color={isSelected ? "primary" : "inherit"} />
                    )}
                </ListItemIcon>
                <ListItemText
                    primary={node.name}
                    slotProps={{
                        primary: {
                            fontSize: '0.875rem',
                            noWrap: true,
                            sx: {
                                lineHeight: 1.1,
                                color: isSelected ? 'primary.main' : 'inherit',
                                fontWeight: isSelected ? 500 : 'inherit'
                            }
                        }
                    }}
                />
                {node.type === 'directory' && !isLoading && (
                    node.isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />
                )}
            </ListItem>

            {/* Context menu for root folders */}
            <Menu
                anchorEl={menuAnchorEl}
                open={menuOpen}
                onClose={handleCloseMenu}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <MenuItem
                    onClick={handleRemoveFolder}
                    sx={{ minHeight: 36, fontSize: 14 }}
                >
                    <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
                        <DeleteOutlineIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                        primary={<FormattedMessage id="menu.fileExplorer.removeFolder" defaultMessage="Remove Folder" />}
                        slotProps={{
                            primary: { fontSize: '0.875rem' }
                        }}
                    />
                </MenuItem>
            </Menu>

            {/* File Drop Dialog */}
            <FileDropDialog
                open={showFileDropDialog}
                onClose={() => setShowFileDropDialog(false)}
                sourcePath={draggedPath}
                targetPath={node.path}
            />

            {/* File Click Dialog */}
            <FileClickDialog
                open={showFileClickDialog}
                onClose={() => setShowFileClickDialog(false)}
                filePath={node.path}
            />

            {node.type === 'directory' && node.isExpanded && node.children && (
                node.children.length > 0 ? (
                    node.children.map((child: any) => (
                        <FileNodeItem key={child.id} node={child} level={level + 1} />
                    ))
                ) : (
                    !isLoading && (
                        <ListItem
                            sx={{
                                pl: 4 + level * 2,
                                py: 0.5,
                                height: 36,
                                minHeight: 36,
                                boxSizing: 'border-box',
                                userSelect: 'none',
                            }}
                        >
                            <Typography variant="body2" color="text.secondary">
                                <FormattedMessage id="file.emptyFolder" defaultMessage="Empty folder" />
                            </Typography>
                        </ListItem>
                    )
                )
            )}
        </div>
    );
}

function FileExplorer({ minContentHeightAbove }: FileExplorerProps) {
    const { height, isExpanded, setHeight, setIsExpanded } = useFileExplorerStore();
    const { rootFolders, isLoading, addRootFolder } = useFilesStore();
    const isDragging = useRef(false);
    const startY = useRef(0);
    const fileExplorerRef = useRef<HTMLDivElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isExpanded || !fileExplorerRef.current) return;

        e.preventDefault();
        isDragging.current = true;
        startY.current = e.clientY;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "ns-resize";
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            e.preventDefault();

            if (!isDragging.current || !fileExplorerRef.current) return;

            const selfElement = fileExplorerRef.current;
            const menuContainer = selfElement.closest('#menu-container');
            const menuHeaderWrapper = menuContainer?.querySelector('#menu-header-wrapper');

            if (!menuContainer || !menuHeaderWrapper) {
                console.warn("FileExplorer resize: Could not find layout elements (#menu-container, #menu-header-wrapper).");
                return;
            }

            const menuContainerRect = menuContainer.getBoundingClientRect();
            const menuHeaderRect = menuHeaderWrapper.getBoundingClientRect();

            const minExplorerHeight = 40;

            const maxTopYAllowed = menuContainerRect.top + menuHeaderRect.height + minContentHeightAbove;

            const minBottomYAllowed = menuContainerRect.bottom - minExplorerHeight;

            const clampedClientY = Math.max(maxTopYAllowed, Math.min(e.clientY, minBottomYAllowed));

            const newHeight = menuContainerRect.bottom - clampedClientY;

            if (newHeight !== height) {
                setHeight(newHeight);
            }
        };

        const handleMouseUp = (e: MouseEvent) => {
            e.preventDefault();

            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.userSelect = "";
                document.body.style.cursor = "";
            }
        };

        if (isExpanded) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [setHeight, height, isExpanded, minContentHeightAbove]);

    return (
        <Box ref={fileExplorerRef} sx={{ borderTop: 1, borderColor: "divider", position: "relative" }}>
            {isExpanded && (
                <Box
                    sx={{
                        height: "4px",
                        cursor: "ns-resize",
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        "&:hover": { bgcolor: "rgba(0, 0, 0, 0.1)" }
                    }}
                    onMouseDown={handleMouseDown}
                />
            )}

            <MenuSection>
                <Box>
                    <MenuListItem
                        icon={<FolderIcon color="primary" fontSize="small" />}
                        label={<FormattedMessage id="menu.fileExplorer" />}
                        isSelected={false}
                        textColor="primary.main"
                        onClick={() => setIsExpanded(!isExpanded)}
                        endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                        sx={{
                            fontWeight: 700,
                            fontSize: "0.95rem"
                        }}
                    />

                    {isExpanded && (
                        <Box
                            sx={{
                                height: `${height}px`,
                                overflow: "auto",
                                transition: isDragging.current ? 'none' : 'height 0.2s ease',
                            }}
                        >
                            {isLoading && (
                                <Box display="flex" justifyContent="center" p={2}>
                                    <CircularProgress size={24} />
                                </Box>
                            )}

                            {!isLoading && rootFolders.length === 0 ? (
                                <Box
                                    display="flex"
                                    flexDirection="column"
                                    alignItems="center"
                                    justifyContent="center"
                                    height="100%"
                                    p={2}
                                    textAlign="center"
                                >
                                    <Typography color="text.secondary" gutterBottom>
                                        <FormattedMessage id="menu.fileExplorer.empty" defaultMessage="No folders found" />
                                    </Typography>
                                    <Button
                                        startIcon={<CreateNewFolderIcon />}
                                        variant="outlined"
                                        size="small"
                                        color="primary"
                                        sx={{ mt: 1 }}
                                        onClick={addRootFolder}
                                    >
                                        <FormattedMessage id="menu.fileExplorer.addFolder" defaultMessage="Add Folder" />
                                    </Button>
                                </Box>
                            ) : (
                                <div>
                                    {rootFolders.map(folder => (
                                        <FileNodeItem key={folder.id} node={folder} />
                                    ))}
                                    <ListItem
                                        onClick={addRootFolder}
                                        sx={{
                                            pl: 2,
                                            py: 0.5,
                                            cursor: 'pointer',
                                            height: 36,
                                            minHeight: 36
                                        }}
                                    >
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <CreateNewFolderIcon fontSize="small" color="primary" />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={<FormattedMessage id="menu.fileExplorer.addFolder" defaultMessage="Add Folder" />}
                                            slotProps={{
                                                primary: { fontSize: '0.875rem' }
                                            }}
                                        />
                                    </ListItem>
                                </div>
                            )}
                        </Box>
                    )}
                </Box>
            </MenuSection>
        </Box>
    );
}

export default FileExplorer;
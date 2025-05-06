import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    FormHelperText,
    Box,
    Typography,
    Link
} from "@mui/material";
import { useState, useEffect } from "react";
import { OpenInNew } from "@mui/icons-material";

// Field definition type
type FieldType = "text" | "password" | "number" | "select" | "apiKey";

export interface Field {
    key: string;
    label: string;
    type: FieldType;
    required: boolean;
    options?: string[]; // For select fields
    placeholder?: string;
    description?: string; // Description text
    descriptionLink?: { // Optional link in the description
        text: string;    // Link text
        url: string;     // URL to open
    };
}

interface MCPDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
    title: string;
    fields: Field[];
    serviceType: string;
    initialData?: Record<string, any>;
}

const MCPDialog = ({
    open,
    onClose,
    onSave,
    title,
    fields,
    serviceType,
    initialData = {}
}: MCPDialogProps) => {
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Reset form data when dialog opens or fields change
    useEffect(() => {
        if (open) {
            // Initialize with initial data or empty values
            const newFormData: Record<string, any> = {};
            fields.forEach(field => {
                newFormData[field.key] = initialData[field.key] || '';
            });
            setFormData(newFormData);
            setErrors({});
        }
    }, [open, fields, initialData]);

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));

        // Clear error when field is changed
        if (errors[key]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[key];
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        fields.forEach(field => {
            if (field.required && !formData[field.key]) {
                newErrors[field.key] = `${field.label} is required`;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            onSave(formData);
        }
    };

    // Create a component for the description with optional link
    const FieldDescription = ({ field }: { field: Field }) => {
        if (!field.description && !field.descriptionLink) return null;

        return (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                {field.description}
                {field.descriptionLink && (
                    <>
                        {field.description && " "}
                        <Link
                            href={field.descriptionLink.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: 'inline-flex', alignItems: 'center' }}
                        >
                            {field.descriptionLink.text}
                            <OpenInNew sx={{ fontSize: '0.8rem', ml: 0.5 }} />
                        </Link>
                    </>
                )}
            </Typography>
        );
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <Box component="form" sx={{ pt: 1 }}>
                    {fields.map((field) => (
                        <Box key={field.key} sx={{ mb: 2 }}>
                            {field.type === 'select' && field.options ? (
                                <FormControl
                                    fullWidth
                                    margin="normal"
                                    error={!!errors[field.key]}
                                    size="small"
                                >
                                    <InputLabel>{field.label}</InputLabel>
                                    <Select
                                        value={formData[field.key] || ''}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        label={field.label}
                                    >
                                        {field.options.map(option => (
                                            <MenuItem key={option} value={option}>
                                                {option}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors[field.key] && (
                                        <FormHelperText>{errors[field.key]}</FormHelperText>
                                    )}
                                    {field.description || field.descriptionLink ? (
                                        <FormHelperText sx={{ mt: 0.5 }}>
                                            <FieldDescription field={field} />
                                        </FormHelperText>
                                    ) : null}
                                </FormControl>
                            ) : (
                                <>
                                    <TextField
                                        label={field.label}
                                        fullWidth
                                        margin="normal"
                                        type={field.type}
                                        value={formData[field.key] || ''}
                                        onChange={(e) => handleChange(field.key, e.target.value)}
                                        error={!!errors[field.key]}
                                        helperText={errors[field.key]}
                                        placeholder={field.placeholder}
                                        size="small"
                                        InputProps={{
                                            type: field.type === 'password' ? 'password' : field.type
                                        }}
                                    />
                                    {(field.description || field.descriptionLink) && (
                                        <FieldDescription field={field} />
                                    )}
                                </>
                            )}
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleSubmit} variant="contained">Save</Button>
            </DialogActions>
        </Dialog>
    );
};

export default MCPDialog;

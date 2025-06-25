import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Chip,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Upload as UploadIcon,
  Publish as PublishIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  SmartToy as SmartToyIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { StudentSubmissionData, Assignment, MarkingScheme, Submission } from './types';
import { toast } from '@/utils/toast';
import { getUserTokenFromStore } from '@/utils/user';

interface StudentTableProps {
  studentData: StudentSubmissionData[];
  selectedAssignmentData?: Assignment;
  currentMarkingScheme?: MarkingScheme;
  apiToken?: string;
  workspaceId: string;
  onGradeEdit: (studentId: string, field: 'currentGrade' | 'feedback', value: string) => void;
  onToggleEdit: (studentId: string) => void;
  onSaveGrade: (studentId: string) => void;
  onAdoptAiGrade: (studentId: string) => void;
}

export default function StudentTable({
  studentData,
  selectedAssignmentData,
  currentMarkingScheme,
  apiToken,
  workspaceId,
  onGradeEdit,
  onToggleEdit,
  onSaveGrade,
  onAdoptAiGrade
}: StudentTableProps) {
  const intl = useIntl();

  const getSubmissionStatus = (submission?: Submission) => {
    if (!submission) return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.noSubmission', defaultMessage: 'No submission' });
    
    switch (submission.status) {
      case 'submitted': return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.submitted', defaultMessage: 'Submitted' });
      case 'draft': return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.draft', defaultMessage: 'Draft' });
      case 'new': return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.notStarted', defaultMessage: 'Not started' });
      default: return submission.status;
    }
  };

  const getStatusColor = (submission?: Submission) => {
    if (!submission) return 'error';
    
    switch (submission.status) {
      case 'submitted': return 'success';
      case 'draft': return 'warning';
      case 'new': return 'info';
      default: return 'default';
    }
  };

  // Helper function to create a dummy zip file
  const createDummyZipFile = (studentName: string): Promise<string> => {
    return new Promise((resolve) => {
      // Create a simple text file content as dummy data
      const content = `Dummy submission file for ${studentName}\nGenerated at: ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const uploadToOnlysaid = async (studentId: string) => {
    if (!selectedAssignmentData || !workspaceId) {
      toast.error('Assignment or workspace information missing');
      return;
    }

    const token = getUserTokenFromStore();
    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    const studentData_item = studentData.find(data => data.student.id === studentId);
    if (!studentData_item) {
      toast.error('Student data not found');
      return;
    }

    try {
      toast.info(`Uploading submission for ${studentData_item.student.fullname}...`);

      // Create dummy zip file content
      const dummyFileData = await createDummyZipFile(studentData_item.student.fullname);
      
      // Construct the path: gradings/{assignmentId}/{student}/zipFile
      const uploadPath = `gradings/${selectedAssignmentData.id}/${studentData_item.student.username}/submission.zip`;
      
      const metadata = {
        targetPath: uploadPath,
        type: 'student-submission',
        assignmentId: selectedAssignmentData.id,
        studentId: studentId,
        studentName: studentData_item.student.fullname,
        submissionDate: new Date().toISOString()
      };

      const response = await window.electron.fileSystem.uploadFile({
        workspaceId,
        fileData: dummyFileData,
        fileName: 'submission.zip',
        token,
        metadata
      });

      if (response.error) {
        toast.error(`Upload failed for ${studentData_item.student.fullname}: ${response.error}`);
      } else {
        toast.success(`Submission uploaded successfully for ${studentData_item.student.fullname}`);
        console.log('Upload successful:', {
          path: uploadPath,
          student: studentData_item.student.fullname,
          assignment: selectedAssignmentData.name
        });
      }
    } catch (error: any) {
      console.error('Error uploading submission:', error);
      toast.error(`Error uploading submission for ${studentData_item.student.fullname}`);
    }
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'text.primary' }}>
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.student', defaultMessage: 'Student' })}
            </TableCell>
            <TableCell sx={{ color: 'text.primary' }}>
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.submissionStatus', defaultMessage: 'Submission Status' })}
            </TableCell>
            <TableCell sx={{ color: 'text.primary' }}>
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.aiGrade', defaultMessage: 'AI Grade' })}
            </TableCell>
            <TableCell sx={{ color: 'text.primary' }}>
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.currentGrade', defaultMessage: 'Current Grade' })}
            </TableCell>
            <TableCell sx={{ color: 'text.primary' }}>
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.feedback', defaultMessage: 'Feedback' })}
            </TableCell>
            <TableCell sx={{ color: 'text.primary' }}>
              {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.actions', defaultMessage: 'Actions' })}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {studentData.map((data) => (
            <TableRow key={data.student.id}>
              <TableCell>
                <Box>
                  <Typography variant="body2" fontWeight="medium" color="text.primary">
                    {data.student.fullname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.student.email}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={getSubmissionStatus(data.submission)}
                  color={getStatusColor(data.submission) as any}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.primary">
                  {data.aiGrade || intl.formatMessage({ id: 'workspace.insights.moodle.autograde.aiGradeNotAvailable', defaultMessage: 'Not available' })}
                  {data.aiGrade && selectedAssignmentData?.grade && 
                    ` / ${selectedAssignmentData.grade}`}
                </Typography>
              </TableCell>
              <TableCell>
                {data.isEditing ? (
                  <TextField
                    size="small"
                    type="number"
                    value={data.currentGrade}
                    onChange={(e) => onGradeEdit(data.student.id, 'currentGrade', e.target.value)}
                    inputProps={{ min: 0, max: selectedAssignmentData?.grade || 100 }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        color: 'text.primary'
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.primary">
                    {data.currentGrade || intl.formatMessage({ id: 'workspace.insights.moodle.autograde.notGraded', defaultMessage: 'Not graded' })}
                    {data.currentGrade && selectedAssignmentData?.grade && 
                      ` / ${selectedAssignmentData.grade}`}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                {data.isEditing ? (
                  <TextField
                    size="small"
                    multiline
                    rows={2}
                    value={data.feedback}
                    onChange={(e) => onGradeEdit(data.student.id, 'feedback', e.target.value)}
                    placeholder={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.feedbackPlaceholder', defaultMessage: 'Enter feedback...' })}
                    sx={{ 
                      minWidth: 200,
                      '& .MuiOutlinedInput-root': {
                        color: 'text.primary'
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.primary">
                    {data.feedback || intl.formatMessage({ id: 'workspace.insights.moodle.autograde.noFeedback', defaultMessage: 'No feedback' })}
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  {data.isEditing ? (
                    <>
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.saveGrade', defaultMessage: 'Save Grade' })}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => onSaveGrade(data.student.id)}
                        >
                          <SaveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.cancel', defaultMessage: 'Cancel' })}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleEdit(data.student.id)}
                        >
                          <CancelIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      {(() => {
                        const submissionFile = data.submission?.plugins
                          ?.find(p => p.type === 'file')
                          ?.fileareas?.find((fa: { area: string }) => fa.area === 'submission_files')
                          ?.files?.[0];

                        const canDownload = data.submission?.status === 'submitted' && submissionFile && apiToken;
                        
                        let downloadUrl = '';
                        if (canDownload) {
                          const separator = submissionFile.fileurl.includes('?') ? '&' : '?';
                          downloadUrl = `${submissionFile.fileurl}${separator}token=${apiToken}`;
                        }

                        const tooltipTitle = canDownload
                          ? intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.downloadSubmission', defaultMessage: 'Download Submission' })
                          : intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.noSubmissionToDownload', defaultMessage: 'No submission to download' });

                        return (
                          <Tooltip title={tooltipTitle}>
                            <span>
                              <IconButton
                                size="small"
                                disabled={!canDownload}
                                onClick={() => window.open(downloadUrl, '_blank')}
                              >
                                <DownloadIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        );
                      })()}
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.autoGrade', defaultMessage: 'Auto Grade with KB' })}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={!currentMarkingScheme}
                            onClick={() => toast.info('Auto-grading with KB feature coming soon!')}
                          >
                            <SmartToyIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.adoptAiGrade', defaultMessage: 'Adopt AI Grade' })}>
                        <span>
                          <IconButton
                            size="small"
                            color="secondary"
                            disabled={!data.aiGrade}
                            onClick={() => onAdoptAiGrade(data.student.id)}
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.editGrade', defaultMessage: 'Edit Grade' })}>
                        <IconButton
                          size="small"
                          onClick={() => onToggleEdit(data.student.id)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.publishGrade', defaultMessage: 'Publish Grade' })}>
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            disabled={!data.currentGrade}
                          >
                            <PublishIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.uploadToOnlySaid', defaultMessage: 'Upload to OnlySaid' })}>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => uploadToOnlysaid(data.student.id)}
                        >
                          <UploadIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
} 
import React, { useState, useRef, useEffect } from 'react';
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
  RestartAlt as RestartAltIcon,
  Clear as ClearIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { StudentSubmissionData, Assignment, MarkingScheme, Submission } from './types';
import { toast } from '@/utils/toast';
import { getUserTokenFromStore } from '@/utils/user';
import FeedbackDetail from '@/renderer/components/Dialog/Insight/FeedbackDetail';

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
  onResetAiGrade: (studentId: string) => void;
  onExecuteAutoGrade: (studentId: string) => void;
  onPublishGrade: (studentId: string) => void;
  onDeleteGrade: (studentId: string) => void;
}

// Component to detect if text spans more than 2 lines
const ClickableFeedbackText = ({ 
  feedback, 
  onViewDetails 
}: { 
  feedback: string; 
  onViewDetails: () => void; 
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const intl = useIntl();

  useEffect(() => {
    if (textRef.current && feedback) {
      // Create a temporary element to measure text height
      const tempElement = document.createElement('div');
      tempElement.style.position = 'absolute';
      tempElement.style.visibility = 'hidden';
      tempElement.style.width = textRef.current.offsetWidth + 'px';
      tempElement.style.fontSize = window.getComputedStyle(textRef.current).fontSize;
      tempElement.style.fontFamily = window.getComputedStyle(textRef.current).fontFamily;
      tempElement.style.lineHeight = window.getComputedStyle(textRef.current).lineHeight;
      tempElement.innerHTML = feedback.replace(/\n/g, '<br>');
      
      document.body.appendChild(tempElement);
      
      // Calculate if text spans more than 2 lines
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const textHeight = tempElement.offsetHeight;
      const maxHeight = lineHeight * 2; // 2 lines
      
      setIsMultiLine(textHeight > maxHeight);
      
      document.body.removeChild(tempElement);
    }
  }, [feedback]);

  if (!feedback) {
    return (
      <Typography variant="body2" color="text.secondary" fontStyle="italic">
        {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.noFeedback', defaultMessage: 'No feedback' })}
      </Typography>
    );
  }

  return (
    <Box sx={{ position: 'relative', minHeight: '40px' }}>
      <Typography 
        ref={textRef}
        variant="body2" 
        color="text.primary"
        sx={{ 
          cursor: isMultiLine ? 'pointer' : 'default',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.4,
          position: 'relative',
          '&::after': isMultiLine ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            borderRadius: 0.5,
            transition: 'background-color 0.2s ease',
          } : {},
          '&:hover::after': isMultiLine ? {
            backgroundColor: 'action.hover',
          } : {},
        }}
        onClick={isMultiLine ? onViewDetails : undefined}
        title={isMultiLine ? intl.formatMessage({ 
          id: 'workspace.insights.moodle.autograde.clickToViewFullFeedback', 
          defaultMessage: 'Click to view full feedback' 
        }) : undefined}
      >
        {feedback}
      </Typography>
    </Box>
  );
};

export default function StudentTable({
  studentData,
  selectedAssignmentData,
  currentMarkingScheme,
  apiToken,
  workspaceId,
  onGradeEdit,
  onToggleEdit,
  onSaveGrade,
  onAdoptAiGrade,
  onResetAiGrade,
  onExecuteAutoGrade,
  onPublishGrade,
  onDeleteGrade
}: StudentTableProps) {
  const intl = useIntl();
  const [feedbackDetailOpen, setFeedbackDetailOpen] = useState(false);
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<StudentSubmissionData | null>(null);

  // Helper function to format scores to 1 decimal place
  const formatScore = (score: string | number | undefined | null): string => {
    if (score === undefined || score === null || score === '') return '';
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore) || numScore < 0) return ''; // Handle -1 and other negative values
    return numScore.toFixed(1);
  };

  // Helper function to check if a grade is valid (not deleted/ungraded)
  const isValidGrade = (score: string | number | undefined | null): boolean => {
    if (score === undefined || score === null || score === '') return false;
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    return !isNaN(numScore) && numScore >= 0; // Only positive grades are valid
  };

  const getSubmissionStatus = (submission?: Submission) => {
    if (!submission) return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.noSubmission', defaultMessage: 'No submission' });
    
    switch (submission.status) {
      case 'submitted': return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.submitted', defaultMessage: 'Submitted' });
      case 'draft': return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.draft', defaultMessage: 'Draft' });
      case 'new': return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.status.notStarted', defaultMessage: 'Not started' });
      default: return submission.status;
    }
  };

  const getSubmissionStatusColor = (submission?: Submission) => {
    if (!submission) return 'error';
    
    switch (submission.status) {
      case 'submitted': return 'success';
      case 'draft': return 'warning';
      case 'new': return 'info';
      default: return 'default';
    }
  };

  const getGradeStatus = (data: StudentSubmissionData) => {
    // PRIORITY 1: Check actual Moodle API data (data.grade)
    if (data.grade && data.grade.grade > 0) {
      return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.gradeStatus.published', defaultMessage: 'Published' });
    } 
    // PRIORITY 2: Check if there's a pending grade to be published
    else if (data.currentGrade && data.currentGrade !== '0' && data.currentGrade !== '' && parseFloat(data.currentGrade) >= 0) {
      return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.gradeStatus.pending', defaultMessage: 'Pending' });
    } 
    // PRIORITY 3: No grade at all
    else {
      return intl.formatMessage({ id: 'workspace.insights.moodle.autograde.gradeStatus.notGraded', defaultMessage: 'Not graded' });
    }
  };

  const getGradeStatusColor = (data: StudentSubmissionData) => {
    // PRIORITY 1: Check actual Moodle API data (data.grade)
    if (data.grade && data.grade.grade > 0) {
      return 'success';
    } 
    // PRIORITY 2: Check if there's a pending grade to be published
    else if (data.currentGrade && data.currentGrade !== '0' && data.currentGrade !== '' && parseFloat(data.currentGrade) >= 0) {
      return 'warning';
    } 
    // PRIORITY 3: No grade at all
    else {
      return 'error';
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

  const handleViewFeedback = (studentData: StudentSubmissionData) => {
    setSelectedStudentForFeedback(studentData);
    setFeedbackDetailOpen(true);
  };

  const handleResetFeedback = (studentId: string) => {
    const studentDataItem = studentData.find(data => data.student.id === studentId);
    if (!studentDataItem) return;

    onGradeEdit(studentId, 'feedback', '');
    toast.success(`Feedback reset for ${studentDataItem.student.fullname}`);
  };

  const renderFeedbackCell = (data: StudentSubmissionData) => {
    if (data.isEditing) {
      return (
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
      );
    }

    return (
      <ClickableFeedbackText
        feedback={data.feedback}
        onViewDetails={() => handleViewFeedback(data)}
      />
    );
  };

  return (
    <>
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
                {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.gradeStatus', defaultMessage: 'Grade Status' })}
              </TableCell>
              <TableCell sx={{ color: 'text.primary' }}>
                {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.aiGrade', defaultMessage: 'AI Grade' })}
              </TableCell>
              <TableCell sx={{ color: 'text.primary' }}>
                {intl.formatMessage({ id: 'workspace.insights.moodle.autograde.table.currentGrade', defaultMessage: 'Current Grade' })}
              </TableCell>
              <TableCell sx={{ color: 'text.primary', minWidth: 250 }}>
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
                    color={getSubmissionStatusColor(data.submission) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getGradeStatus(data)}
                    color={getGradeStatusColor(data) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.primary">
                    {isValidGrade(data.aiGrade) ? formatScore(data.aiGrade) : intl.formatMessage({ id: 'workspace.insights.moodle.autograde.aiGradeNotAvailable', defaultMessage: 'Not available' })}
                    {isValidGrade(data.aiGrade) && selectedAssignmentData?.grade && 
                      ` / ${formatScore(selectedAssignmentData.grade)}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  {data.isEditing ? (
                    <TextField
                      size="small"
                      type="number"
                      value={data.currentGrade}
                      onChange={(e) => onGradeEdit(data.student.id, 'currentGrade', e.target.value)}
                      inputProps={{ 
                        min: 0, 
                        max: selectedAssignmentData?.grade || 100,
                        step: 0.1
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: 'text.primary'
                        }
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.primary">
                      {isValidGrade(data.currentGrade) ? formatScore(data.currentGrade) : intl.formatMessage({ id: 'workspace.insights.moodle.autograde.notGraded', defaultMessage: 'Not graded' })}
                      {isValidGrade(data.currentGrade) && selectedAssignmentData?.grade && 
                        ` / ${formatScore(selectedAssignmentData.grade)}`}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  {renderFeedbackCell(data)}
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
                              onClick={() => onExecuteAutoGrade(data.student.id)}
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
                        <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.resetAiGrade', defaultMessage: 'Reset AI Grade' })}>
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={!data.aiGrade}
                              onClick={() => onResetAiGrade(data.student.id)}
                            >
                              <RestartAltIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.resetFeedback', defaultMessage: 'Reset Feedback' })}>
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              disabled={!data.feedback}
                              onClick={() => handleResetFeedback(data.student.id)}
                            >
                              <ClearIcon />
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
                              onClick={() => onPublishGrade(data.student.id)}
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
                        <Tooltip title={intl.formatMessage({ id: 'workspace.insights.moodle.autograde.tooltip.deleteGrade', defaultMessage: 'Delete Grade & Feedback' })}>
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={!data.currentGrade && !data.feedback && (!data.grade || data.grade.grade <= 0)}
                              onClick={() => onDeleteGrade(data.student.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </span>
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

      {/* Feedback Detail Dialog */}
      {selectedStudentForFeedback && (
        <FeedbackDetail
          open={feedbackDetailOpen}
          onClose={() => {
            setFeedbackDetailOpen(false);
            setSelectedStudentForFeedback(null);
          }}
          studentName={selectedStudentForFeedback.student.fullname}
          assignmentName={selectedAssignmentData?.name}
          feedback={selectedStudentForFeedback.feedback}
          aiGrade={selectedStudentForFeedback.aiGrade}
          currentGrade={selectedStudentForFeedback.currentGrade}
          maxGrade={formatScore(selectedAssignmentData?.grade)}
        />
      )}
    </>
  );
} 
import { 
  Box, Typography, Card, CardContent, Alert, TextField, MenuItem, Button, 
  CircularProgress, Divider, FormControl, InputLabel, Select, SelectChangeEvent, 
  Accordion, AccordionSummary, AccordionDetails, Chip, RadioGroup, 
  FormControlLabel, Radio, Checkbox, Paper, LinearProgress 
} from "@mui/material";
import { FormattedMessage, useIntl } from "react-intl";
import { useState, useEffect } from "react";
// QuizHelper component for generating and evaluating practice questions
import QuizIcon from "@mui/icons-material/Quiz";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import InfoIcon from "@mui/icons-material/Info";
import { useKBStore } from "@/renderer/stores/KB/KBStore";
import { toast } from "@/utils/toast";
import MarkdownRenderer from "@/renderer/components/Chat/MarkdownRenderer";
import { 
  useQuizHelperStore, 
  useCurrentQuizSession,
  type QuestionFormData,
  type GeneratedQuestion,
  type ShortAnswerEvaluation,
  type GenerationDetails 
} from "@/renderer/stores/Mypartner/Quizhelper";

interface QuizHelperProps {
  workspaceId: string;
}

function QuizHelper({ workspaceId }: QuizHelperProps) {
  const intl = useIntl();
  const { getKnowledgeBaseDetailsList } = useKBStore();
  
  // Early return if no workspaceId
  if (!workspaceId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          <FormattedMessage 
            id="workspace.mypartner.courseworkHelper.noWorkspaceSelected" 
            defaultMessage="No workspace selected"
          />
        </Alert>
      </Box>
    );
  }
  
  // Use the store for state management
  const store = useQuizHelperStore();
  const currentSession = useCurrentQuizSession(workspaceId);
  
  // Use direct selectors to ensure re-renders
  const isGenerating = useQuizHelperStore(state => state.isGenerating);
  const isCheckingAnswers = useQuizHelperStore(state => state.isCheckingAnswers);
  const loadingExplanations = useQuizHelperStore(state => state.loadingExplanations);
  const evaluatingAnswers = useQuizHelperStore(state => state.evaluatingAnswers);
  const error = useQuizHelperStore(state => state.error);
  
  // Local state for real-time analysis progress
  const [analysisProgress, setAnalysisProgress] = useState<{
    current: number;
    total: number;
    rate: number;
    eta: number;
    isActive: boolean;
  }>({ current: 0, total: 0, rate: 0, eta: 0, isActive: false });
  
  // Get current session data or use defaults
  const session = currentSession.session;
  const formData = currentSession.formConfig || {
    questionCount: 5,
    questionType: 'multiple_choice' as const,
    difficulty: 'medium' as const,
    selectedKbIds: []
  };
  const availableKbs = currentSession.availableKbs || [];
  const generatedQuestions = session?.questions || [];
  const userAnswers = session?.userAnswers || {};
  const showAnswers = session?.showAnswers || false;
  const wrongAnswerExplanations = session?.wrongAnswerExplanations || {};
  const shortAnswerEvaluations = session?.shortAnswerEvaluations || {};
  const generationDetails = session?.generationDetails || null;
  const generationCount = session?.generationCount || 0;

  // Debug effect to track state changes
  useEffect(() => {
    console.log('QuizHelper state update:', {
      workspaceId,
      hasSession: !!session,
      questionsCount: generatedQuestions.length,
      answersCount: Object.keys(userAnswers).length,
      isGenerating,
      isCheckingAnswers,
      availableKbsCount: availableKbs.length,
      formDataValid: !!formData && formData.selectedKbIds.length > 0
    });
  }, [workspaceId, session, generatedQuestions.length, Object.keys(userAnswers).length, isGenerating, isCheckingAnswers, availableKbs.length, formData]);

  // Load available knowledge bases
  useEffect(() => {
    const loadKnowledgeBases = async () => {
      try {
        const kbs = await getKnowledgeBaseDetailsList(workspaceId);
        if (kbs) {
          store.setAvailableKbs(workspaceId, kbs);
          // Auto-select all KBs by default if no configuration exists
          const currentConfig = store.getFormConfiguration(workspaceId);
          if (currentConfig.selectedKbIds.length === 0) {
            store.updateFormField(workspaceId, 'selectedKbIds', kbs.map(kb => kb.id));
          }
        }
      } catch (error) {
        console.error('Failed to load knowledge bases:', error);
        toast.error(intl.formatMessage({ id: 'quizHelper.toast.loadKnowledgeBasesFailed' }));
        store.setError('Failed to load knowledge bases');
      }
    };

    if (workspaceId) {
      loadKnowledgeBases();
    }
  }, [workspaceId, getKnowledgeBaseDetailsList, store]);

  const handleFormChange = (field: keyof QuestionFormData, value: any) => {
    currentSession.updateFormField(field, value);
  };

  const handleKbSelectionChange = (kbId: string, checked: boolean) => {
    const currentKbIds = formData.selectedKbIds;
    const newKbIds = checked 
      ? [...currentKbIds, kbId]
      : currentKbIds.filter((id: string) => id !== kbId);
    currentSession.updateFormField('selectedKbIds', newKbIds);
  };

  const processQuestionsWithMath = (questions: GeneratedQuestion[]): GeneratedQuestion[] => {
    return questions.map(question => ({
      ...question,
      question: processLightRAGResponse(question.question),
      options: question.options?.map(option => processLightRAGResponse(option)),
      correctAnswer: typeof question.correctAnswer === 'string' 
        ? processLightRAGResponse(question.correctAnswer) 
        : question.correctAnswer,
      explanation: question.explanation ? processLightRAGResponse(question.explanation) : question.explanation
    }));
  };

  const processLightRAGResponse = (response: string): string => {
    if (!response) return response;
    
    let processedResponse = response;
    
    // Lightweight cleanup for mathematical expressions
    // Since we're now asking AI to generate clean math, we only need minimal processing
    
    // 1. Remove any stray LaTeX delimiters (safety cleanup)
    processedResponse = processedResponse.replace(/\$\$([^$]*?)\$\$/g, '$1');
    processedResponse = processedResponse.replace(/\$([^$]*?)\$/g, '$1');
    
    // 2. Only convert obvious LaTeX commands that might slip through
    processedResponse = processedResponse.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
    processedResponse = processedResponse.replace(/\\text\{([^}]+)\}/g, '$1');
    processedResponse = processedResponse.replace(/\\mathrm\{([^}]+)\}/g, '$1');
    
    // 3. Only process LaTeX Greek letters if they exist (fallback safety)
    processedResponse = processedResponse.replace(/\\Delta/g, 'Δ');
    processedResponse = processedResponse.replace(/\\delta/g, 'δ');
    processedResponse = processedResponse.replace(/\\epsilon/g, 'ε');
    processedResponse = processedResponse.replace(/\\alpha/g, 'α');
    processedResponse = processedResponse.replace(/\\beta/g, 'β');
    processedResponse = processedResponse.replace(/\\gamma/g, 'γ');
    processedResponse = processedResponse.replace(/\\theta/g, 'θ');
    processedResponse = processedResponse.replace(/\\pi/g, 'π');
    processedResponse = processedResponse.replace(/\\sigma/g, 'σ');
    processedResponse = processedResponse.replace(/\\tau/g, 'τ');
    processedResponse = processedResponse.replace(/\\phi/g, 'φ');
    processedResponse = processedResponse.replace(/\\omega/g, 'ω');
    processedResponse = processedResponse.replace(/\\lambda/g, 'λ');
    processedResponse = processedResponse.replace(/\\mu/g, 'μ');
    
    // 4. Enhance existing Unicode mathematical expressions with better styling
    // Only enhance if they're already in Unicode format (preserve clean content)
    processedResponse = processedResponse.replace(/(ε₀|ε₁|ε₂|ε₃|ε₄|ε₅|ε₆|ε₇|ε₈|ε₉)/g, 
      '<span style="font-size: 1.05em;">$1</span>');
    processedResponse = processedResponse.replace(/(Δ|π|Ω)/g, 
      '<span style="font-size: 1.05em; font-weight: 600;">$1</span>');
    
    // 5. Basic cleanup only
    processedResponse = processedResponse.replace(/\s+/g, ' ');
    processedResponse = processedResponse.trim();
    
    return processedResponse;
  };

  const generateQuestions = async () => {
    if (formData.selectedKbIds.length === 0) {
      toast.error(intl.formatMessage({ id: 'quizHelper.toast.selectKnowledgeBase' }));
      return;
    }

    store.setIsGenerating(true);
    store.setError(null);

    try {
      // Create randomized elements for variety
      const randomSeed = Math.random().toString(36).substring(7);
      const timestamp = Date.now();
      
      // Random question approaches for variety
      const questionApproaches = [
        'practical application and real-world scenarios',
        'conceptual understanding and theoretical knowledge',
        'problem-solving and critical thinking',
        'analysis and evaluation of concepts',
        'synthesis and comparison of ideas',
        'application of principles to new situations'
      ];
      
      // Random question styles
      const questionStyles = [
        'scenario-based questions that test practical application',
        'concept-focused questions that test understanding',
        'analytical questions that require reasoning',
        'comparative questions that explore relationships',
        'application questions that test real-world usage',
        'evaluative questions that require judgment'
      ];
      
      // Random focus areas to vary content
      const focusAreas = [
        'fundamental concepts and principles',
        'practical applications and examples',
        'key relationships and connections',
        'important processes and procedures',
        'critical facts and definitions',
        'essential theories and models'
      ];

      // Randomly select elements
      const selectedApproach = questionApproaches[Math.floor(Math.random() * questionApproaches.length)];
      const selectedStyle = questionStyles[Math.floor(Math.random() * questionStyles.length)];
      const selectedFocus = focusAreas[Math.floor(Math.random() * focusAreas.length)];

      // Create generation details for display
      const generationDetailsObj: GenerationDetails = {
        approach: selectedApproach,
        style: selectedStyle,
        focus: selectedFocus,
        seed: randomSeed
      };

      const questionTypeText = formData.questionType === 'mixed' 
        ? 'a mix of multiple choice, short answer, and true/false questions'
        : formData.questionType.replace('_', ' ');

      const difficultyText = formData.difficulty === 'mixed' 
        ? 'varying difficulty levels' 
        : `${formData.difficulty} difficulty`;

      // Create a varied prompt with randomization
      const prompt = `Generate ${formData.questionCount} unique exam practice questions based on the content in the knowledge base.

Generation ID: ${randomSeed}-${timestamp}

Focus Approach: ${selectedApproach}
Question Style: ${selectedStyle}
Content Focus: ${selectedFocus}

Requirements:
- Question type: ${questionTypeText}
- Difficulty: ${difficultyText}
- Create ${selectedStyle} that emphasize ${selectedApproach}
- Focus on ${selectedFocus} from the knowledge base content
- Ensure each question tests different aspects or concepts
- Avoid repetitive or overly similar questions

CRITICAL MATHEMATICAL FORMATTING RULES:
- Use simple, human-readable mathematical expressions (NO LaTeX)
- For fractions: use simple division notation (e.g., "Δv/Δt" for acceleration)
- For superscripts: use Unicode symbols (e.g., "m/s²" not "m/s^2")
- For subscripts: use Unicode symbols (e.g., "ε₀" not "epsilon_0")
- Use Unicode Greek letters: Δ, ε, α, β, γ, θ, π, σ, etc.
- Keep expressions simple and readable without special formatting
- DO NOT use LaTeX commands like \frac{}, \Delta, \epsilon, etc.
- DO NOT use $ or $$ delimiters
- Examples of CORRECT formatting:
  * "Using the formula a = Δv/Δt"
  * "The acceleration is 0.417 m/s²"
  * "Capacitance C = ε₀ × A/d"
  * "Energy E = ½mv²"
  * "Force F = ma"

Format the response as a JSON array where each question object has:
- id: unique identifier (use prefix "${randomSeed}_")
- type: "multiple_choice", "short_answer", or "true_false"
- question: the question text (use SIMPLE human-readable math as shown above)
- options: array of 4 options (for multiple choice only, use SIMPLE human-readable math)
- correctAnswer: correct answer (index number for multiple choice, text with SIMPLE math for others)
- explanation: brief explanation of the correct answer (use SIMPLE human-readable math)
- difficulty: "easy", "medium", or "hard"
- topic: relevant topic/subject area

Special Instructions:
- For multiple choice: Create 4 distinct options with only one clearly correct answer
- For true/false: Create definitive statements that can be clearly true or false
- For short answer: Provide concise model answers that demonstrate key understanding
- Use ONLY the simple mathematical formatting shown in the examples above
- NO LaTeX commands, NO $ delimiters, NO complex formatting
- Vary the complexity and scope of questions within the specified difficulty
- Draw from different sections or topics in the knowledge base when possible
- Make questions that would help students prepare for different types of exam scenarios

Mathematical Formatting Examples:
- Capacitance: "C = ε₀ × A/d"
- Energy: "E = ½mv²"
- Greek letters: "α, β, γ, δ, ε, θ, λ, μ, π, σ"
- Acceleration: "a = Δv/Δt"
- Force: "F = ma"
- Units: "m/s²", "kg⋅m/s²", "J/kg"

Randomization seed: ${randomSeed}
Generation timestamp: ${new Date().toISOString()}

Return only the JSON array, no additional text.`;

      // Query the knowledge base using LightRAG
      const response: any = await window.electron.knowledgeBase.queryNonStreaming({
        workspaceId: workspaceId,
        queryText: prompt,
        kbIds: formData.selectedKbIds,
        topK: 20, // Get more context for better question generation
        preferredLanguage: 'en'
      });

      if (response && response.response) {
        try {
          // Try to extract JSON from the response
          let jsonStr = response.response;
          
          // Clean up the response if it's wrapped in markdown or has extra text
          const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }

          const questions = JSON.parse(jsonStr);
          
          if (Array.isArray(questions) && questions.length > 0) {
            const processedQuestions = processQuestionsWithMath(questions);
            currentSession.createSession(processedQuestions, generationDetailsObj);
            toast.success(intl.formatMessage(
              { id: 'quizHelper.toast.questionsGenerated' },
              { count: questions.length }
            ));
          } else {
            throw new Error('Invalid question format received');
          }
        } catch (parseError) {
          console.error('Failed to parse questions:', parseError);
          // Fallback: create a manual question if JSON parsing fails
          const fallbackQuestions: GeneratedQuestion[] = [{
            id: '1',
            type: 'short_answer',
            question: 'Based on the knowledge base content, explain a key concept or topic.',
            correctAnswer: 'Please refer to the knowledge base content for the answer.',
            explanation: 'This question requires understanding of the material in your knowledge base.',
            difficulty: formData.difficulty === 'mixed' ? 'medium' : formData.difficulty,
            topic: 'General Knowledge'
          }];
          
          const processedFallbackQuestions = processQuestionsWithMath(fallbackQuestions);
          currentSession.createSession(processedFallbackQuestions, generationDetailsObj);
          toast.warning(intl.formatMessage({ id: 'quizHelper.toast.basicQuestionGenerated' }));
        }
      } else {
        throw new Error('No response received from knowledge base');
      }
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast.error(intl.formatMessage(
        { id: 'quizHelper.toast.failedToGenerate' },
        { error: error.message || 'Unknown error' }
      ));
      store.setError(`Failed to generate questions: ${error.message || 'Unknown error'}`);
    } finally {
      store.setIsGenerating(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    currentSession.updateAnswer(questionId, answer);
  };

  const generateWrongAnswerExplanation = async (question: GeneratedQuestion, userAnswer: any) => {
    if (!userAnswer || userAnswer === '' || userAnswer === question.correctAnswer) {
      return null;
    }

    try {
      store.setLoadingExplanation(question.id, true);

      let userAnswerText = userAnswer;
      if (question.type === 'multiple_choice' && question.options) {
        userAnswerText = question.options[userAnswer] || userAnswer;
      }

      const correctAnswerText = question.type === 'multiple_choice' && question.options
        ? question.options[question.correctAnswer as number]
        : question.correctAnswer;

      const prompt = `Analyze this question and provide a structured explanation for why the user's answer is incorrect.

Question: ${question.question}
User's Answer: ${userAnswerText}
Correct Answer: ${correctAnswerText}

IMPORTANT: Use simple, human-readable mathematical expressions (NO LaTeX):
- Use Unicode Greek letters: ε, α, β, etc.
- Use Unicode subscripts: ε₀, C₀, etc.
- Use simple fractions: A/d, Δv/Δt, etc.
- Use Unicode superscripts: x², m/s², etc.
- Examples: "ε₀", "Δv/Δt", "F = ma", "E = mc²"

Please provide a clear, educational response in the following structured format:

**Why Your Answer is Incorrect:**
[Explain specifically what's wrong with the user's answer - 1-2 sentences, use simple Unicode math symbols]

**The Correct Understanding:**
[Explain the correct concept or principle - 1-2 sentences, use simple Unicode math symbols]

**Key Learning Point:**
[Highlight the main takeaway or concept to remember - 1 sentence, use simple Unicode math symbols]

Use information from the knowledge base to support your explanations. Keep each section concise but informative.`;

      const response = await window.electron.knowledgeBase.queryNonStreaming({
        workspaceId: workspaceId,
        queryText: prompt,
        kbIds: formData.selectedKbIds,
        topK: 10,
        preferredLanguage: 'en'
      });

      if (response && response.response) {
        const explanation = response.response.trim();
        const processedExplanation = processLightRAGResponse(explanation);
        currentSession.addExplanation(question.id, processedExplanation);
        return processedExplanation;
      }
    } catch (error) {
      console.error('Error generating wrong answer explanation:', error);
      return null;
    } finally {
      store.setLoadingExplanation(question.id, false);
    }
  };

  const parseStructuredExplanation = (explanation: string) => {
    // Parse the structured explanation text
    const sections = {
      incorrect: '',
      correct: '',
      keyPoint: ''
    };

    // Split by sections and extract content
    const lines = explanation.split('\n').filter(line => line.trim());
    let currentSection = '';

    for (const line of lines) {
      if (line.includes('**Why Your Answer is Incorrect:**') || line.includes('Why Your Answer is Incorrect:')) {
        currentSection = 'incorrect';
      } else if (line.includes('**The Correct Understanding:**') || line.includes('The Correct Understanding:')) {
        currentSection = 'correct';
      } else if (line.includes('**Key Learning Point:**') || line.includes('Key Learning Point:')) {
        currentSection = 'keyPoint';
      } else if (line.trim() && currentSection) {
        // Remove markdown formatting
        const cleanLine = line.replace(/\*\*/g, '').replace(/^\[|\]$/g, '').trim();
        if (cleanLine && !cleanLine.includes('**')) {
          sections[currentSection as keyof typeof sections] += (sections[currentSection as keyof typeof sections] ? ' ' : '') + cleanLine;
        }
      }
    }

    return sections;
  };

  const renderStructuredExplanation = (explanation: string) => {
    const sections = parseStructuredExplanation(explanation);
    
    // If parsing failed, show original explanation with MarkdownRenderer
    if (!sections.incorrect && !sections.correct && !sections.keyPoint) {
      return (
        <Box sx={{ color: 'error.dark' }}>
          <MarkdownRenderer content={explanation} />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sections.incorrect && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 20, mt: 0.5, flexShrink: 0 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" color="error.dark" sx={{ fontWeight: 600, mb: 0.5 }}>
                {intl.formatMessage({ id: 'quizHelper.explanation.whyIncorrect' })}
              </Typography>
              <Box sx={{ color: 'error.dark', '& p': { lineHeight: 1.5, margin: 0 } }}>
                <MarkdownRenderer content={sections.incorrect} />
              </Box>
            </Box>
          </Box>
        )}
        
        {sections.correct && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 20, mt: 0.5, flexShrink: 0 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" color="success.dark" sx={{ fontWeight: 600, mb: 0.5 }}>
                {intl.formatMessage({ id: 'quizHelper.explanation.correctUnderstanding' })}
              </Typography>
              <Box sx={{ color: 'success.dark', '& p': { lineHeight: 1.5, margin: 0 } }}>
                <MarkdownRenderer content={sections.correct} />
              </Box>
            </Box>
          </Box>
        )}
        
        {sections.keyPoint && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <LightbulbIcon sx={{ color: 'warning.main', fontSize: 20, mt: 0.5, flexShrink: 0 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" color="warning.dark" sx={{ fontWeight: 600, mb: 0.5 }}>
                {intl.formatMessage({ id: 'quizHelper.explanation.keyLearningPoint' })}
              </Typography>
              <Box sx={{ color: 'warning.dark', '& p': { lineHeight: 1.5, margin: 0, fontWeight: 500 } }}>
                <MarkdownRenderer content={sections.keyPoint} />
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  const evaluateShortAnswer = async (question: GeneratedQuestion, userAnswer: string) => {
    if (!userAnswer || !userAnswer.trim()) {
      return null;
    }

    try {
      store.setEvaluatingAnswer(question.id, true);

      const prompt = `Evaluate this student's short answer response for correctness and provide detailed feedback.

Question: ${question.question}

Expected/Model Answer: ${question.correctAnswer}

Student's Answer: ${userAnswer}

Please evaluate the student's response based on:
1. Factual accuracy
2. Completeness of key concepts
3. Understanding demonstrated
4. Relevance to the question

IMPORTANT: Use simple, human-readable mathematical expressions in your feedback (NO LaTeX):
- Use Unicode Greek letters: ε, α, β, etc.
- Use Unicode subscripts: ε₀, C₀, etc.
- Use simple fractions: A/d, Δv/Δt, etc.
- Use Unicode superscripts: x², m/s², etc.
- Examples: "ε₀", "Δv/Δt", "F = ma", "E = mc²"

Respond in the following JSON format:
{
  "isCorrect": true/false,
  "score": 0-100,
  "feedback": "Detailed feedback explaining why the answer is correct/incorrect and what could be improved (use simple Unicode math symbols)",
  "keyPointsCovered": ["list", "of", "key", "points", "covered"],
  "keyPointsMissing": ["list", "of", "missing", "points"]
}

Evaluation criteria:
- 80-100: Excellent - Covers all key points accurately
- 60-79: Good - Covers most key points with minor gaps
- 40-59: Adequate - Shows basic understanding but missing important elements
- 20-39: Poor - Limited understanding, significant gaps
- 0-19: Incorrect - Fundamentally wrong or irrelevant

Be fair but thorough in your evaluation. Consider partial credit for partially correct answers.`;

      const response = await window.electron.knowledgeBase.queryNonStreaming({
        workspaceId: workspaceId,
        queryText: prompt,
        kbIds: formData.selectedKbIds,
        topK: 10,
        preferredLanguage: 'en'
      });

      if (response && response.response) {
        try {
          // Try to extract JSON from the response
          let jsonStr = response.response;
          const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            jsonStr = jsonMatch[0];
          }

          const evaluation = JSON.parse(jsonStr);
          
          const result: ShortAnswerEvaluation = {
            isCorrect: evaluation.isCorrect || evaluation.score >= 60, // Consider 60+ as correct
            feedback: processLightRAGResponse(evaluation.feedback || 'Evaluation completed.'),
            score: evaluation.score || 0
          };

          currentSession.addEvaluation(question.id, result);
          return result;
        } catch (parseError) {
          console.error('Failed to parse evaluation:', parseError);
          // Fallback evaluation
          const fallbackResult: ShortAnswerEvaluation = {
            isCorrect: false,
            feedback: processLightRAGResponse('Unable to evaluate the answer automatically. Please review manually.'),
            score: 0
          };
          
          currentSession.addEvaluation(question.id, fallbackResult);
          return fallbackResult;
        }
      }
    } catch (error) {
      console.error('Error evaluating short answer:', error);
      return null;
    } finally {
      store.setEvaluatingAnswer(question.id, false);
    }
  };

  const checkAnswers = async () => {
    store.setIsCheckingAnswers(true);
    currentSession.setShowAnswers(true);
    
    // Identify all questions that need async analysis
    const shortAnswerQuestions = generatedQuestions.filter(q => 
      q.type === 'short_answer' && userAnswers[q.id] && userAnswers[q.id].trim()
    );

    const wrongAnswerQuestions = generatedQuestions.filter(q => {
      const userAnswer = userAnswers[q.id];
      
      // Skip short answers - they get detailed evaluation feedback instead
      if (q.type === 'short_answer') {
        return false;
      }
      
      return userAnswer !== undefined && userAnswer !== '' && userAnswer !== q.correctAnswer;
    });

    const totalAsyncTasks = shortAnswerQuestions.length + wrongAnswerQuestions.length;
    
    if (totalAsyncTasks > 0) {
      // Dynamic concurrency calculation based on task count and complexity
      const maxConcurrency = Math.min(8, Math.max(3, Math.ceil(totalAsyncTasks / 2))); // Optimized for LightRAG API
      const rateLimitDelay = totalAsyncTasks > 10 ? 200 : 100; // Adaptive rate limiting
      
      toast.info(intl.formatMessage(
        { id: 'quizHelper.toast.analysesRunning' },
        { count: totalAsyncTasks, concurrency: maxConcurrency }
      ));
      
      // Prepare analysis tasks with retry logic and enhanced metadata
      const analysisTasksWithRetry = [
        // Short answer evaluations with retry
        ...shortAnswerQuestions.map(question => ({
          type: 'evaluation' as const,
          questionId: question.id,
          priority: 1, // Higher priority for evaluations
          complexity: 'high',
          task: () => analyzeWithRetry(
            () => evaluateShortAnswer(question, userAnswers[question.id]),
            question.id,
            'Short Answer Evaluation',
            3 // More retries for evaluations
          )
        })),
        
        // Wrong answer explanations with retry
        ...wrongAnswerQuestions.map(question => ({
          type: 'explanation' as const,
          questionId: question.id,
          priority: 2, // Lower priority for explanations  
          complexity: 'medium',
          task: () => analyzeWithRetry(
            () => generateWrongAnswerExplanation(question, userAnswers[question.id]),
            question.id,
            'Wrong Answer Explanation',
            2 // Fewer retries for explanations
          )
        }))
      ];

      // Sort tasks by priority for optimal processing order
      analysisTasksWithRetry.sort((a, b) => a.priority - b.priority);

      // Execute all analyses using advanced parallel processing
      try {
        const startTime = Date.now();
        
        // Initialize enhanced progress tracking
        setAnalysisProgress({
          current: 0,
          total: totalAsyncTasks,
          rate: 0,
          eta: 0,
          isActive: true
        });
        
        // Real-time progress tracking with adaptive updates
        const progressInterval = setInterval(() => {
          const elapsed = (Date.now() - startTime) / 1000;
          const currentProgress = analysisProgress.current;
          const rate = currentProgress / elapsed;
          const eta = currentProgress > 0 ? Math.round((totalAsyncTasks - currentProgress) / rate) : 0;
          
          // Only update if values changed significantly to reduce re-renders
          if (Math.abs(analysisProgress.rate - rate) > 0.1 || Math.abs(analysisProgress.eta - eta) > 1) {
            setAnalysisProgress(prev => ({
              ...prev,
              rate: parseFloat(rate.toFixed(1)),
              eta: Math.max(0, eta)
            }));
          }
          
          console.log(`🔄 Parallel Analysis: ${Math.round((currentProgress / totalAsyncTasks) * 100)}% (${currentProgress}/${totalAsyncTasks}) | Rate: ${rate.toFixed(1)}/s | ETA: ${eta}s | Concurrency: ${maxConcurrency}`);
        }, 500); // More frequent updates for smooth progress

        // Process analyses using advanced parallel processing
        const results = await processParallel(
          analysisTasksWithRetry,
          async ({ type, questionId, task, priority, complexity }) => {
            try {
              const taskStartTime = Date.now();
              const result = await task();
              const taskDuration = Date.now() - taskStartTime;
              
              console.log(`✅ ${type} for ${questionId} completed in ${taskDuration}ms (priority: ${priority}, complexity: ${complexity})`);
              
              return { type, questionId, result, success: true, duration: taskDuration };
            } catch (error) {
              console.error(`❌ Final failure for ${type} on question ${questionId}:`, error);
              return { type, questionId, error, success: false };
            }
          },
          maxConcurrency, // Dynamic concurrency control
          rateLimitDelay // Adaptive rate limiting
        );

        clearInterval(progressInterval);
        
        // Reset progress state
        setAnalysisProgress(prev => ({ ...prev, isActive: false }));
        
        const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);

        // Advanced results analysis with performance metrics
        const successful = results.filter(r => r.result?.success).length;
        const failed = results.filter(r => r.error || !r.result?.success).length;
        
        const evaluationResults = results.filter(r => r.result?.type === 'evaluation');
        const explanationResults = results.filter(r => r.result?.type === 'explanation');
        
        const successfulEvaluations = evaluationResults.filter(r => r.result?.success).length;
        const successfulExplanations = explanationResults.filter(r => r.result?.success).length;

        // Calculate performance metrics
        const tasksWithDuration = results.filter(r => r.result?.duration);
        const avgDuration = tasksWithDuration.length > 0 
          ? tasksWithDuration.reduce((sum, r) => sum + (r.result?.duration || 0), 0) / tasksWithDuration.length
          : 0;
        const maxDuration = Math.max(...tasksWithDuration.map(r => r.result?.duration || 0), 0);
        const minDuration = Math.min(...tasksWithDuration.map(r => r.result?.duration || Infinity).filter(d => d !== Infinity), 0);

        // Enhanced results logging with performance insights
        console.log('🚀 Advanced Parallel Analysis Results:', {
          timing: { 
            totalTime: `${processingTime}s`, 
            averagePerTask: `${(parseFloat(processingTime) / totalAsyncTasks).toFixed(2)}s`,
            taskDurations: { avg: `${Math.round(avgDuration)}ms`, min: `${minDuration}ms`, max: `${maxDuration}ms` }
          },
          concurrency: { 
            maxConcurrency, 
            effectiveParallelism: `${(totalAsyncTasks / parseFloat(processingTime)).toFixed(1)} tasks/s`,
            rateLimitDelay: `${rateLimitDelay}ms`
          },
          evaluations: { successful: successfulEvaluations, total: shortAnswerQuestions.length },
          explanations: { successful: successfulExplanations, total: wrongAnswerQuestions.length },
          overall: { 
            successful, 
            failed, 
            successRate: `${Math.round((successful / totalAsyncTasks) * 100)}%`,
            efficiency: `${Math.round((successful / totalAsyncTasks) * (totalAsyncTasks / parseFloat(processingTime)) * 100) / 100} successful tasks/s`
          }
        });

        // Enhanced user feedback with performance insights
        if (failed > 0) {
          toast.warning(intl.formatMessage(
            { id: 'quizHelper.toast.analysesFailed' },
            { 
              failed, 
              total: totalAsyncTasks, 
              successRate: Math.round((successful / totalAsyncTasks) * 100),
              time: processingTime 
            }
          ));
        } else {
          const throughput = (totalAsyncTasks / parseFloat(processingTime)).toFixed(1);
          toast.success(intl.formatMessage(
            { id: 'quizHelper.toast.analysesCompleted' },
            { 
              count: totalAsyncTasks, 
              time: processingTime, 
              throughput 
            }
          ));
        }

             } catch (error) {
         console.error('💥 Critical error during batch analysis:', error);
         toast.error('Analysis system encountered an error, continuing with available results');
         
         // Reset progress state on error
         setAnalysisProgress(prev => ({ ...prev, isActive: false }));
       }
    }

    // Calculate final score with intelligent evaluation
    const correct = generatedQuestions.filter(q => {
      const userAnswer = userAnswers[q.id];
      
      if (q.type === 'short_answer') {
        // Use LightRAG evaluation result
        const evaluation = shortAnswerEvaluations[q.id];
        return evaluation?.isCorrect || false;
      } else {
        // Use exact matching for multiple choice and true/false
        return userAnswer === q.correctAnswer;
      }
    }).length;

    store.setIsCheckingAnswers(false);
    
    // Enhanced success message with analysis summary
    const analysisCount = totalAsyncTasks;
    const scoreMessage = intl.formatMessage(
      { id: 'quizHelper.toast.scoreResult' },
      { correct, total: generatedQuestions.length }
    );
    const analysisMessage = analysisCount > 0 
      ? intl.formatMessage({ id: 'quizHelper.toast.withAnalyses' }, { count: analysisCount })
      : '';
    
    toast.success(scoreMessage + analysisMessage);
  };

  // Advanced parallel processing with dynamic concurrency control
  const processParallel = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    maxConcurrency: number = 5,
    rateLimitDelay: number = 100
  ): Promise<Array<{ item: T; result?: R; error?: any }>> => {
    if (items.length === 0) return [];
    
    const results: Array<{ item: T; result?: R; error?: any }> = [];
    const executing: Set<Promise<void>> = new Set();
    let completedCount = 0;
    
    console.log(`🚀 Starting advanced parallel processing: ${items.length} tasks, max concurrency: ${maxConcurrency}`);
    
    // Process items with concurrency limit
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Create promise for this task
      const taskPromise = (async () => {
        try {
          const startTime = Date.now();
          const result = await processor(item);
          const duration = Date.now() - startTime;
          
          results[i] = { item, result };
          completedCount++;
          
          console.log(`✅ Task ${completedCount}/${items.length} completed in ${duration}ms`);
          
          // Update progress in real-time
          setAnalysisProgress(prev => ({
            ...prev,
            current: completedCount
          }));
          
        } catch (error) {
          console.error(`❌ Task ${i + 1} failed:`, error);
          results[i] = { item, error };
          completedCount++;
        }
        
        // Rate limiting delay
        if (rateLimitDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, rateLimitDelay));
        }
      })();
      
      executing.add(taskPromise);
      
      // Remove completed tasks
      taskPromise.finally(() => {
        executing.delete(taskPromise);
      });
      
      // Wait if we've reached max concurrency
      if (executing.size >= maxConcurrency) {
        await Promise.race(executing);
      }
    }
    
    // Wait for all remaining tasks to complete
    await Promise.all(executing);
    
    console.log(`🎯 Parallel processing completed: ${completedCount}/${items.length} tasks finished`);
    return results;
  };

  // Legacy batch processing (kept for fallback)
  const processBatch = async <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 3,
    delayMs: number = 100
  ): Promise<Array<{ item: T; result?: R; error?: any }>> => {
    console.log(`⚡ Using legacy batch processing: ${items.length} items, batch size: ${batchSize}`);
    return await processParallel(items, processor, batchSize, delayMs);
  };

  // Enhanced async analysis with intelligent retry logic
  const analyzeWithRetry = async (
    analysisFunc: () => Promise<any>,
    questionId: string,
    type: string,
    maxRetries: number = 2
  ): Promise<any> => {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const attemptStartTime = Date.now();
        const result = await analysisFunc();
        const attemptDuration = Date.now() - attemptStartTime;
        
        if (attempt > 1) {
          console.log(`✅ ${type} for question ${questionId} succeeded on attempt ${attempt} in ${attemptDuration}ms`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        console.error(`❌ ${type} for question ${questionId} failed on attempt ${attempt}:`, error);
        
        if (attempt <= maxRetries) {
          // Intelligent exponential backoff with jitter
          const baseDelay = 1000 * Math.pow(1.5, attempt - 1);
          const jitter = Math.random() * 500; // Add randomness to prevent thundering herd
          const delay = Math.min(baseDelay + jitter, 8000);
          
          console.log(`⏳ Retrying ${type} for question ${questionId} in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries + 1})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all attempts failed
    console.error(`💥 ${type} for question ${questionId} failed after ${maxRetries + 1} attempts`);
    throw lastError;
  };

  const resetQuiz = () => {
    currentSession.clearSession();
    store.resetLoadingStates();
    store.setError(null);
  };

  const renderQuestion = (question: GeneratedQuestion, index: number) => {
    const userAnswer = userAnswers[question.id];
    let isCorrect = false;
    let isIncorrect = false;
    
    if (showAnswers && userAnswer !== undefined) {
      if (question.type === 'short_answer') {
        // Use LightRAG evaluation result
        const evaluation = shortAnswerEvaluations[question.id];
        isCorrect = evaluation?.isCorrect || false;
        isIncorrect = !isCorrect && userAnswer !== '';
      } else {
        // Use exact matching for multiple choice and true/false
        isCorrect = userAnswer === question.correctAnswer;
        isIncorrect = userAnswer !== question.correctAnswer && userAnswer !== '';
      }
    }

    return (
      <Card key={question.id} sx={{ mb: 2, border: showAnswers ? (isCorrect ? '2px solid green' : isIncorrect ? '2px solid red' : undefined) : undefined }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              {intl.formatMessage(
                { id: 'quizHelper.questions.question' },
                { number: index + 1 }
              )}
            </Typography>
            <Chip 
              label={question.type.replace('_', ' ')} 
              size="small" 
              variant="outlined" 
              sx={{ mr: 1 }}
            />
            <Chip 
              label={question.difficulty} 
              size="small" 
              color={question.difficulty === 'hard' ? 'error' : question.difficulty === 'medium' ? 'warning' : 'success'}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <MarkdownRenderer content={question.question} />
          </Box>

          {question.type === 'multiple_choice' && question.options && (
            <RadioGroup
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(question.id, parseInt(e.target.value))}
            >
              {question.options.map((option, optionIndex) => (
                <FormControlLabel
                  key={optionIndex}
                  value={optionIndex}
                  control={<Radio disabled={showAnswers} />}
                  label={<MarkdownRenderer content={option} />}
                  sx={{
                    bgcolor: showAnswers
                      ? optionIndex === question.correctAnswer
                        ? 'success.light'
                        : userAnswer === optionIndex && userAnswer !== question.correctAnswer
                        ? 'error.light'
                        : undefined
                      : undefined,
                    borderRadius: 1,
                    px: 1,
                    alignItems: 'flex-start',
                    '& .MuiFormControlLabel-label': {
                      mt: 0.5
                    }
                  }}
                />
              ))}
            </RadioGroup>
          )}

          {question.type === 'true_false' && (
            <RadioGroup
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              row
            >
              <FormControlLabel
                value="true"
                control={<Radio disabled={showAnswers} />}
                label={intl.formatMessage({ id: 'quizHelper.questions.true' })}
                sx={{
                  bgcolor: showAnswers
                    ? question.correctAnswer === 'true'
                      ? 'success.light'
                      : userAnswer === 'true' && question.correctAnswer !== 'true'
                      ? 'error.light'
                      : undefined
                    : undefined,
                  borderRadius: 1,
                  px: 1,
                  mr: 2
                }}
              />
              <FormControlLabel
                value="false"
                control={<Radio disabled={showAnswers} />}
                label={intl.formatMessage({ id: 'quizHelper.questions.false' })}
                sx={{
                  bgcolor: showAnswers
                    ? question.correctAnswer === 'false'
                      ? 'success.light'
                      : userAnswer === 'false' && question.correctAnswer !== 'false'
                      ? 'error.light'
                      : undefined
                    : undefined,
                  borderRadius: 1,
                  px: 1
                }}
              />
            </RadioGroup>
          )}

          {question.type === 'short_answer' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder={intl.formatMessage({ id: 'quizHelper.questions.answerPlaceholder' })}
              value={userAnswer || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              disabled={showAnswers}
              sx={{ mb: 2 }}
            />
          )}

          {showAnswers && (
            <Box sx={{ mt: 2, p: 3, bgcolor: 'success.lighter', borderRadius: 2, border: '1px solid', borderColor: 'success.main' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CheckCircleIcon sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                <Typography variant="subtitle2" color="success.dark" sx={{ fontWeight: 600 }}>
                  {intl.formatMessage({ id: 'quizHelper.answers.correctAnswer' })}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <MarkdownRenderer 
                  content={
                    question.type === 'multiple_choice' && question.options
                      ? question.options[question.correctAnswer as number]
                      : question.correctAnswer as string
                  } 
                />
              </Box>
              
              {/* Short Answer Evaluation Results */}
              {question.type === 'short_answer' && userAnswer && userAnswer.trim() && (
                <Box sx={{ 
                  mb: 2, 
                  p: 3, 
                  bgcolor: isCorrect ? 'success.lighter' : 'warning.lighter', 
                  borderRadius: 2, 
                  border: '2px solid', 
                  borderColor: isCorrect ? 'success.main' : 'warning.main',
                  boxShadow: isCorrect ? '0 2px 8px rgba(76, 175, 80, 0.15)' : '0 2px 8px rgba(255, 152, 0, 0.15)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {isCorrect ? (
                      <CheckCircleIcon sx={{ color: 'success.main', mr: 1, fontSize: 24 }} />
                    ) : (
                      <InfoIcon sx={{ color: 'warning.main', mr: 1, fontSize: 24 }} />
                    )}
                    <Typography variant="h6" color={isCorrect ? 'success.dark' : 'warning.dark'} sx={{ fontWeight: 600 }}>
                      {intl.formatMessage({ id: 'quizHelper.answers.answerEvaluation' })}
                    </Typography>
                    {evaluatingAnswers[question.id] && (
                      <CircularProgress size={20} sx={{ ml: 'auto', color: 'primary.main' }} />
                    )}
                  </Box>
                  
                  {evaluatingAnswers[question.id] ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {intl.formatMessage({ id: 'quizHelper.status.evaluating' })}
                      </Typography>
                    </Box>
                  ) : shortAnswerEvaluations[question.id] ? (
                    <Box>
                      {/* Score Display */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mr: 2, fontWeight: 600 }}>
                          {intl.formatMessage({ id: 'quizHelper.answers.score' })}
                        </Typography>
                        <Chip 
                          label={`${shortAnswerEvaluations[question.id].score}/100`} 
                          color={
                            shortAnswerEvaluations[question.id].score >= 80 ? 'success' :
                            shortAnswerEvaluations[question.id].score >= 60 ? 'warning' : 'error'
                          }
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant="body2" sx={{ ml: 2, fontStyle: 'italic' }}>
                          {shortAnswerEvaluations[question.id].score >= 80 
                            ? intl.formatMessage({ id: 'quizHelper.answers.scoreGrade.excellent' })
                            : shortAnswerEvaluations[question.id].score >= 60 
                            ? intl.formatMessage({ id: 'quizHelper.answers.scoreGrade.good' })
                            : shortAnswerEvaluations[question.id].score >= 40 
                            ? intl.formatMessage({ id: 'quizHelper.answers.scoreGrade.adequate' })
                            : shortAnswerEvaluations[question.id].score >= 20 
                            ? intl.formatMessage({ id: 'quizHelper.answers.scoreGrade.poor' })
                            : intl.formatMessage({ id: 'quizHelper.answers.scoreGrade.incorrect' })
                          }
                        </Typography>
                      </Box>
                      
                      {/* Evaluation Feedback */}
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 1, 
                        border: '1px solid', 
                        borderColor: 'divider' 
                      }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                          {intl.formatMessage({ id: 'quizHelper.answers.detailedFeedback' })}
                        </Typography>
                        <MarkdownRenderer content={shortAnswerEvaluations[question.id].feedback} />
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {intl.formatMessage({ id: 'quizHelper.status.evaluationNotCompleted' })}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {/* Wrong Answer Explanation */}
              {userAnswer !== undefined && userAnswer !== '' && userAnswer !== question.correctAnswer && question.type !== 'short_answer' && (
                <Box sx={{ 
                  mb: 2, 
                  p: 3, 
                  bgcolor: 'error.lighter', 
                  borderRadius: 2, 
                  border: '2px solid', 
                  borderColor: 'error.main',
                  boxShadow: '0 2px 8px rgba(211, 47, 47, 0.15)'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <InfoIcon sx={{ color: 'error.main', mr: 1, fontSize: 24 }} />
                    <Typography variant="h6" color="error.dark" sx={{ fontWeight: 600 }}>
                      {intl.formatMessage({ id: 'quizHelper.answers.answerAnalysis' })}
                    </Typography>
                    {loadingExplanations[question.id] && (
                      <CircularProgress size={20} sx={{ ml: 'auto', color: 'error.main' }} />
                    )}
                  </Box>
                  
                  {/* User's Answer Display */}
                  <Box sx={{ 
                    mb: 2, 
                    p: 2, 
                    bgcolor: 'info.dark', 
                    borderRadius: 1, 
                    border: '1px solid', 
                    borderColor: 'info.dark' 
                  }}>
                    <Typography variant="subtitle2" color="text.primary" sx={{ mb: 0.5, fontWeight: 600 }}>
                      {intl.formatMessage({ id: 'quizHelper.answers.yourAnswer' })}
                    </Typography>
                    <Box sx={{ color: 'text.primary' }}>
                      <MarkdownRenderer 
                        content={
                          question.type === 'multiple_choice' && question.options
                            ? question.options[userAnswer]
                            : processLightRAGResponse(userAnswer.toString())
                        }
                      />
                    </Box>
                  </Box>

                  {loadingExplanations[question.id] ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3 }}>
                      <CircularProgress size={24} sx={{ mr: 2, color: 'error.main' }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {intl.formatMessage({ id: 'quizHelper.status.analyzingAnswer' })}
                      </Typography>
                    </Box>
                  ) : wrongAnswerExplanations[question.id] ? (
                    renderStructuredExplanation(wrongAnswerExplanations[question.id])
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {intl.formatMessage({ id: 'quizHelper.status.explanationNotGenerated' })}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {question.explanation && (
                <Box sx={{ 
                  mt: 2,
                  p: 2, 
                  bgcolor: 'info.lighter', 
                  borderRadius: 1, 
                  border: '1px solid', 
                  borderColor: 'info.main' 
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LightbulbIcon sx={{ color: 'info.main', mr: 1, fontSize: 20 }} />
                    <Typography variant="subtitle2" color="info.dark" sx={{ fontWeight: 600 }}>
                      {intl.formatMessage({ id: 'quizHelper.answers.explanation' })}
                    </Typography>
                  </Box>
                  <MarkdownRenderer content={question.explanation} />
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: 3, pt: 0 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <QuizIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6">
              <FormattedMessage 
                id="workspace.mypartner.coursework.quizHelp.title" 
                defaultMessage="Quiz Helper"
              />
            </Typography>
          </Box>
          <Box sx={{ mb: 3 }}>
            <MarkdownRenderer 
              content={intl.formatMessage({
                id: "workspace.mypartner.coursework.quizHelp.description",
                defaultMessage: "Generate **practice questions** from your knowledge base content for exam preparation.\n\n✨ **Advanced Features:**\n• Multiple choice, short answer, and true/false questions\n• **AI-powered answer evaluation** with detailed feedback\n• **Readable mathematical expressions**: C<sub style=\"font-size: 0.85em;\">0</sub> = ε<sub style=\"font-size: 0.85em;\">0</sub> A/d, E = mc<sup style=\"font-size: 0.85em;\">2</sup>\n• **⚡ Advanced Parallel Processing** - up to 8 concurrent AI analyses\n• **🎯 Smart Task Prioritization** - evaluations processed first\n• **🔄 Intelligent Retry Logic** with exponential backoff\n• **📊 Real-time Progress Tracking** with throughput metrics\n• **🚀 Optimized Performance** for faster question checking"
              })}
            />
          </Box>

          {/* Configuration Form */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label={intl.formatMessage({ id: 'quizHelper.form.questionCount' })}
              type="number"
              value={formData.questionCount}
              onChange={(e) => handleFormChange('questionCount', parseInt(e.target.value) || 1)}
              inputProps={{ min: 1, max: 20 }}
              sx={{ maxWidth: 200 }}
            />

            <FormControl sx={{ maxWidth: 300 }}>
              <InputLabel>{intl.formatMessage({ id: 'quizHelper.form.questionType' })}</InputLabel>
              <Select
                value={formData.questionType}
                label={intl.formatMessage({ id: 'quizHelper.form.questionType' })}
                onChange={(e) => handleFormChange('questionType', e.target.value)}
              >
                <MenuItem value="multiple_choice">
                  {intl.formatMessage({ id: 'quizHelper.questionType.multipleChoice' })}
                </MenuItem>
                <MenuItem value="short_answer">
                  {intl.formatMessage({ id: 'quizHelper.questionType.shortAnswer' })}
                </MenuItem>
                <MenuItem value="true_false">
                  {intl.formatMessage({ id: 'quizHelper.questionType.trueFalse' })}
                </MenuItem>
                <MenuItem value="mixed">
                  {intl.formatMessage({ id: 'quizHelper.questionType.mixed' })}
                </MenuItem>
              </Select>
            </FormControl>

            <FormControl sx={{ maxWidth: 300 }}>
              <InputLabel>{intl.formatMessage({ id: 'quizHelper.form.difficulty' })}</InputLabel>
              <Select
                value={formData.difficulty}
                label={intl.formatMessage({ id: 'quizHelper.form.difficulty' })}
                onChange={(e) => handleFormChange('difficulty', e.target.value)}
              >
                <MenuItem value="easy">{intl.formatMessage({ id: 'quizHelper.difficulty.easy' })}</MenuItem>
                <MenuItem value="medium">{intl.formatMessage({ id: 'quizHelper.difficulty.medium' })}</MenuItem>
                <MenuItem value="hard">{intl.formatMessage({ id: 'quizHelper.difficulty.hard' })}</MenuItem>
                <MenuItem value="mixed">{intl.formatMessage({ id: 'quizHelper.difficulty.mixed' })}</MenuItem>
              </Select>
            </FormControl>

            {/* Knowledge Base Selection */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {intl.formatMessage({ id: 'quizHelper.form.selectKnowledgeBases' })}
              </Typography>
              {availableKbs.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {availableKbs.map((kb) => (
                    <FormControlLabel
                      key={kb.id}
                      control={
                        <Checkbox
                          checked={formData.selectedKbIds.includes(kb.id)}
                          onChange={(e) => handleKbSelectionChange(kb.id, e.target.checked)}
                        />
                      }
                      label={kb.name}
                    />
                  ))}
                </Box>
              ) : (
                <Alert severity="info">
                  {intl.formatMessage({ id: 'quizHelper.form.noKnowledgeBases' })}
                </Alert>
              )}
            </Box>

            <Button
              variant="contained"
              startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoAwesomeIcon />}
              onClick={generateQuestions}
              disabled={isGenerating || formData.selectedKbIds.length === 0}
              sx={{ maxWidth: 300 }}
            >
              {isGenerating 
                ? intl.formatMessage({ id: 'quizHelper.button.generating' })
                : intl.formatMessage({ id: 'quizHelper.button.generateQuestions' })
              }
            </Button>
          </Box>
        </CardContent>
      </Card>



      {/* Generated Questions */}
      {generatedQuestions.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6">
                {intl.formatMessage(
                  { id: 'quizHelper.questions.title' },
                  { count: generatedQuestions.length }
                )}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!showAnswers && (
                  <Button
                    variant="outlined"
                    startIcon={isCheckingAnswers ? <CircularProgress size={20} /> : <CheckCircleIcon />}
                    onClick={checkAnswers}
                    disabled={Object.keys(userAnswers).length === 0 || isCheckingAnswers}
                  >
                    {isCheckingAnswers 
                      ? intl.formatMessage({ id: 'quizHelper.button.checking' })
                      : intl.formatMessage({ id: 'quizHelper.button.checkAnswers' })
                    }
                  </Button>
                )}
                <Button
                  variant="outlined"
                  onClick={resetQuiz}
                >
                  {intl.formatMessage({ id: 'quizHelper.button.reset' })}
                </Button>
              </Box>
            </Box>

            {/* Real-time Analysis Progress */}
            {analysisProgress.isActive && (
              <Box sx={{ 
                mb: 3, 
                p: 3, 
                bgcolor: 'info.lighter', 
                borderRadius: 2, 
                border: '2px solid', 
                borderColor: 'info.main',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CircularProgress size={24} sx={{ mr: 2, color: 'info.main' }} />
                  <Typography variant="h6" color="info.dark" sx={{ fontWeight: 600 }}>
                    {intl.formatMessage({ id: 'quizHelper.progress.title' })}
                  </Typography>
                  <Box sx={{ ml: 'auto', textAlign: 'right' }}>
                    <Typography variant="h6" color="info.dark" sx={{ fontWeight: 700 }}>
                      {intl.formatMessage(
                        { id: 'quizHelper.progress.complete' },
                        { current: analysisProgress.current, total: analysisProgress.total }
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {intl.formatMessage(
                        { id: 'quizHelper.progress.percentComplete' },
                        { percent: Math.round((analysisProgress.current / analysisProgress.total) * 100) }
                      )}
                    </Typography>
                  </Box>
                </Box>
                
                <LinearProgress 
                  variant="determinate" 
                  value={(analysisProgress.current / analysisProgress.total) * 100}
                  sx={{ 
                    mb: 2, 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'info.light',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'info.main',
                      borderRadius: 4
                    }
                  }} 
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {intl.formatMessage({ id: 'quizHelper.progress.processingRate' })}
                      </Typography>
                      <Typography variant="body2" color="info.dark" sx={{ fontWeight: 600 }}>
                        {intl.formatMessage(
                          { id: 'quizHelper.progress.analysesPerSecond' },
                          { rate: analysisProgress.rate }
                        )}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {intl.formatMessage({ id: 'quizHelper.progress.estimatedTime' })}
                      </Typography>
                      <Typography variant="body2" color="info.dark" sx={{ fontWeight: 600 }}>
                        {analysisProgress.eta > 0 
                          ? intl.formatMessage(
                              { id: 'quizHelper.progress.remainingTime' },
                              { eta: analysisProgress.eta }
                            )
                          : intl.formatMessage({ id: 'quizHelper.progress.calculating' })
                        }
                      </Typography>
                    </Box>
                  </Box>
                  <Chip 
                    label={intl.formatMessage({ id: 'quizHelper.progress.parallelProcessing' })} 
                    size="small" 
                    color="info" 
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
              </Box>
            )}

            {/* Generation Details */}
            {generationDetails && (
              <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.lighter', borderRadius: 1, border: '1px solid', borderColor: 'primary.main' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <AutoAwesomeIcon sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                  <Typography variant="subtitle2" color="primary.dark" sx={{ fontWeight: 600 }}>
                    {intl.formatMessage(
                      { id: 'quizHelper.generation.freshQuestionSet' },
                      { id: generationDetails.seed }
                    )}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Chip 
                    label={intl.formatMessage(
                      { id: 'quizHelper.generation.focus' },
                      { focus: generationDetails.focus }
                    )} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={intl.formatMessage(
                      { id: 'quizHelper.generation.style' },
                      { style: generationDetails.style }
                    )} 
                    size="small" 
                    color="secondary" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={intl.formatMessage(
                      { id: 'quizHelper.generation.approach' },
                      { approach: generationDetails.approach }
                    )} 
                    size="small" 
                    color="info" 
                    variant="outlined" 
                  />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                  {intl.formatMessage(
                    { id: 'quizHelper.generation.generationNumber' },
                    { number: generationCount }
                  )}
                </Typography>
              </Box>
            )}

            {generatedQuestions.map((question, index) => renderQuestion(question, index))}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default QuizHelper;
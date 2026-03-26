import React, { useState, useRef, useEffect } from 'react';
import { Heart, BookOpen, Target, Plus, X, CheckCircle2, Circle, ChevronRight, Info, MessageCircleHeart, Trash2, MessageCircle, Send, Sparkles, User, CalendarHeart, Coffee, Utensils, Map, Camera, Settings, Bell } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Tab = 'insights' | 'conflicts' | 'dates' | 'journal' | 'goals';

type ChatMessage = {
  id: string;
  sender: 'me' | 'partner' | 'ai';
  text: string;
  timestamp: string;
};

type JournalEntry = {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
};

type GoalStep = {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string;
};

type Goal = {
  id: string;
  title: string;
  description: string;
  steps: GoalStep[];
};

type DateMemory = {
  id: string;
  title: string;
  date: string;
  imageUrl: string;
};

// --- Mock Data ---
const INITIAL_INSIGHTS = [
  {
    id: '1',
    title: 'The "I" Statement',
    description: 'Instead of saying "You never listen," try "I feel unheard when I speak." This reduces defensiveness and opens up communication.',
  },
  {
    id: '2',
    title: 'The 20-Minute Timeout',
    description: 'When heart rates rise above 100bpm, productive conflict resolution is nearly impossible. Take a 20-minute break to self-soothe before returning to the conversation.',
  },
  {
    id: '3',
    title: 'Active Listening',
    description: 'Before responding, summarize what your partner just said: "What I hear you saying is..." This ensures understanding and validates their feelings.',
  }
];

const INITIAL_JOURNALS: JournalEntry[] = [
  {
    id: '1',
    date: 'Oct 24, 2026',
    title: 'A wonderful evening',
    content: 'We finally tried that new Italian place. The pasta was amazing, but the conversation was even better. I felt really connected today.',
    mood: '🥰',
  },
  {
    id: '2',
    date: 'Oct 22, 2026',
    title: 'Working through it',
    content: 'We had a disagreement about the holiday plans. It got tense, but we used the timeout method and came back to it calmly. Proud of us.',
    mood: '😌',
  }
];

const INITIAL_MEMORIES: DateMemory[] = [
  {
    id: 'm1',
    title: 'Picnic at the park',
    date: 'Oct 12, 2026',
    imageUrl: 'https://picsum.photos/seed/picnic/400/300'
  },
  {
    id: 'm2',
    title: 'Pottery class',
    date: 'Sep 28, 2026',
    imageUrl: 'https://picsum.photos/seed/pottery/400/500'
  }
];

const INITIAL_GOALS: Goal[] = [
  {
    id: '1',
    title: 'Improve Communication',
    description: 'Build better habits for daily check-ins and conflict resolution.',
    steps: [
      { id: 's1', text: 'Have a 10-minute daily check-in without phones', completed: true, dueDate: '2026-03-25' },
      { id: 's2', text: 'Read one chapter of a relationship book together', completed: false, dueDate: '2026-03-27' },
      { id: 's3', text: 'Practice active listening during our next disagreement', completed: false },
    ]
  },
  {
    id: '2',
    title: 'Save for a House',
    description: 'Align our finances to buy our first home together.',
    steps: [
      { id: 's4', text: 'Combine our savings accounts', completed: true },
      { id: 's5', text: 'Set a strict monthly budget', completed: true },
      { id: 's6', text: 'Meet with a mortgage broker', completed: false, dueDate: '2026-04-10' },
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('insights');
  
  // State
  const [journals, setJournals] = useState<JournalEntry[]>(INITIAL_JOURNALS);
  const [goals, setGoals] = useState<Goal[]>(INITIAL_GOALS);
  const [memories, setMemories] = useState<DateMemory[]>(INITIAL_MEMORIES);
  
  // UI State
  const [isAddingJournal, setIsAddingJournal] = useState(false);
  const [newJournal, setNewJournal] = useState({ title: '', content: '', mood: '😊' });
  
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', steps: [{ text: '', dueDate: '' }] });
  
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'ai', text: 'Welcome to the safe space. Take a deep breath. What would you like to discuss today?', timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [currentSender, setCurrentSender] = useState<'me' | 'partner'>('me');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Dates State
  const [customDateIdea, setCustomDateIdea] = useState<string | null>(null);
  const [isGeneratingDate, setIsGeneratingDate] = useState(false);

  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemory, setNewMemory] = useState({ title: '', imageUrl: '' });

  useEffect(() => {
    if (activeTab === 'conflicts') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  useEffect(() => {
    if (!notificationsEnabled) return;

    const checkGoals = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      goals.forEach(goal => {
        goal.steps.forEach(step => {
          if (!step.completed && step.dueDate) {
            const dueDate = new Date(step.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
              new Notification('Upcoming Goal Step', {
                body: `"${step.text}" is due tomorrow!`,
              });
            } else if (diffDays < 0) {
              new Notification('Overdue Goal Step', {
                body: `"${step.text}" was due on ${dueDate.toLocaleDateString()}.`,
              });
            }
          }
        });
      });
    };

    // Check once on mount if enabled, then set an interval (e.g., every 24 hours).
    // For demonstration, we'll just check once when the component mounts or when notifications are enabled.
    checkGoals();
    
    // In a real app, you'd use a service worker for background notifications.
    // Here we simulate it with a long interval if the app stays open.
    const interval = setInterval(checkGoals, 24 * 60 * 60 * 1000); 
    return () => clearInterval(interval);
  }, [notificationsEnabled, goals]);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      if (!('Notification' in window)) {
        alert('This browser does not support desktop notification');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  // --- Handlers ---
  const handleSaveJournal = () => {
    if (!newJournal.title.trim() || !newJournal.content.trim()) return;
    
    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      title: newJournal.title,
      content: newJournal.content,
      mood: newJournal.mood,
    };
    
    setJournals([entry, ...journals]);
    setIsAddingJournal(false);
    setNewJournal({ title: '', content: '', mood: '😊' });
  };

  const toggleGoalStep = (goalId: string, stepId: string) => {
    setGoals(goals.map(goal => {
      if (goal.id === goalId) {
        return {
          ...goal,
          steps: goal.steps.map(step => 
            step.id === stepId ? { ...step, completed: !step.completed } : step
          )
        };
      }
      return goal;
    }));
  };

  const handleAddStep = () => {
    setNewGoal({ ...newGoal, steps: [...newGoal.steps, { text: '', dueDate: '' }] });
  };

  const handleStepChange = (index: number, field: 'text' | 'dueDate', value: string) => {
    const updatedSteps = [...newGoal.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setNewGoal({ ...newGoal, steps: updatedSteps });
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = newGoal.steps.filter((_, i) => i !== index);
    setNewGoal({ ...newGoal, steps: updatedSteps });
  };

  const handleSaveGoal = () => {
    if (!newGoal.title.trim()) return;
    
    const validSteps = newGoal.steps
      .filter(s => s.text.trim() !== '')
      .map((step, i) => ({
        id: `s_${Date.now()}_${i}`,
        text: step.text.trim(),
        completed: false,
        dueDate: step.dueDate || undefined
      }));
      
    const goal: Goal = {
      id: Date.now().toString(),
      title: newGoal.title,
      description: newGoal.description,
      steps: validSteps
    };
    
    setGoals([goal, ...goals]);
    setIsAddingGoal(false);
    setNewGoal({ title: '', description: '', steps: [{ text: '', dueDate: '' }] });
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: currentSender,
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const handleGetAiSuggestion = async () => {
    if (!process.env.GEMINI_API_KEY) {
      alert("AI configuration is missing.");
      return;
    }
    setIsAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const history = messages.filter(m => m.sender !== 'ai').map(m => `${m.sender}: ${m.text}`).join('\n');
      const journalContext = journals.map(j => `[${j.date}] Mood: ${j.mood} | ${j.title}: ${j.content}`).join('\n');
      
      const prompt = `You are a relationship counselor mediating a conflict. 
      
Here is some context from the couple's recent journal entries, which may reveal their past conflict resolution patterns, triggers, and overall relationship state:
${journalContext || '(No journal entries yet)'}

Here is the couple's current conversation:
${history || '(No conversation yet)'}

Based on their past patterns from the journal and the current conversation, provide a short, empathetic, and highly personalized constructive suggestion or question (max 2 sentences) to help them understand each other better and resolve this conflict peacefully.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'ai',
          text: response.text,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
        }]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setNewMemory({ ...newMemory, imageUrl: url });
    }
  };

  const handleSaveMemory = () => {
    if (!newMemory.title.trim() || !newMemory.imageUrl) return;
    
    const memory: DateMemory = {
      id: Date.now().toString(),
      title: newMemory.title,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      imageUrl: newMemory.imageUrl
    };
    
    setMemories([memory, ...memories]);
    setIsAddingMemory(false);
    setNewMemory({ title: '', imageUrl: '' });
  };

  const handleGenerateDateIdea = async () => {
    if (!process.env.GEMINI_API_KEY) {
      alert("AI configuration is missing.");
      return;
    }
    setIsGeneratingDate(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Provide a unique, romantic, and fun date night idea for a couple who is struggling to plan. Include a catchy title, a short description, and an estimated cost/time. Format it cleanly without markdown bolding if possible, just simple text.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      
      if (response.text) {
        setCustomDateIdea(response.text);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingDate(false);
    }
  };

  // --- Renderers ---
  const renderInsights = () => (
    <motion.div 
      key="insights"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="p-6 pb-24 space-y-8"
    >
      <div className="space-y-1">
        <h1 className="font-cursive text-5xl text-stone-900 tracking-tight">Insights</h1>
        <p className="text-stone-500 text-sm font-light">Daily wisdom for a healthier connection.</p>
      </div>

      <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-6 card-shadow border border-stone-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-stone-50 p-2.5 rounded-2xl">
            <MessageCircleHeart className="w-5 h-5 text-stone-700" />
          </div>
          <h2 className="font-cursive text-3xl text-stone-800">Daily Focus</h2>
        </div>
        <p className="text-stone-600 leading-relaxed font-light italic">
          "Love is not about how many days, months, or years you have been together. Love is about how much you love each other every single day."
        </p>
      </motion.div>

      <div className="space-y-4">
        <h3 className="font-cursive text-3xl text-stone-800 mt-8 mb-4">Conflict Resolution</h3>
        {INITIAL_INSIGHTS.map((insight) => (
          <motion.div whileHover={{ y: -2 }} key={insight.id} className="bg-white rounded-3xl p-6 card-shadow border border-stone-100">
            <h4 className="font-medium text-stone-800 mb-2">{insight.title}</h4>
            <p className="text-stone-500 text-sm leading-relaxed font-light">{insight.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderDates = () => (
    <motion.div 
      key="dates"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="p-6 pb-24 space-y-8"
    >
      <div className="space-y-1 mb-6">
        <h1 className="font-cursive text-5xl text-stone-900 tracking-tight">Date Ideas</h1>
        <p className="text-stone-500 text-sm font-light">Inspiration for your next adventure.</p>
      </div>

      {/* AI Generator */}
      <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-6 card-shadow border border-stone-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-50 pointer-events-none" />
        <div className="flex items-center gap-3 mb-3 relative z-10">
          <div className="bg-stone-50 p-2.5 rounded-2xl">
            <Sparkles className="w-5 h-5 text-stone-700" />
          </div>
          <h3 className="font-cursive text-3xl text-stone-800">Can't Decide?</h3>
        </div>
        <p className="text-sm text-stone-500 mb-6 font-light relative z-10">Let AI generate a custom date night idea tailored just for you.</p>
        
        {customDateIdea ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-stone-50 rounded-2xl p-5 mb-6 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap font-light border border-stone-100">
            {customDateIdea}
          </motion.div>
        ) : null}

        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerateDateIdea}
          disabled={isGeneratingDate}
          className="w-full bg-stone-900 text-white py-3.5 rounded-2xl text-sm font-medium shadow-sm hover:bg-stone-800 transition-colors disabled:opacity-50 relative z-10"
        >
          {isGeneratingDate ? 'Sparking ideas...' : 'Generate Custom Date'}
        </motion.button>
      </motion.div>

      {/* Curated List */}
      <div className="space-y-4">
        <h3 className="font-cursive text-3xl text-stone-800">Curated Classics</h3>
        
        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 card-shadow border border-stone-100 flex gap-4 items-start">
          <div className="bg-stone-50 p-3 rounded-2xl shrink-0">
            <Coffee className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <h4 className="font-medium text-stone-800">Coffee Shop Crawl</h4>
            <p className="text-sm text-stone-500 mt-1 font-light leading-relaxed">Visit 3 different local cafes. Rate their lattes and share a pastry at the last stop.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 card-shadow border border-stone-100 flex gap-4 items-start">
          <div className="bg-stone-50 p-3 rounded-2xl shrink-0">
            <Utensils className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <h4 className="font-medium text-stone-800">Chopped: Home Edition</h4>
            <p className="text-sm text-stone-500 mt-1 font-light leading-relaxed">Pick 3 random ingredients from the pantry and cook a meal together using all of them.</p>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} className="bg-white rounded-3xl p-5 card-shadow border border-stone-100 flex gap-4 items-start">
          <div className="bg-stone-50 p-3 rounded-2xl shrink-0">
            <Map className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <h4 className="font-medium text-stone-800">Hometown Tourist</h4>
            <p className="text-sm text-stone-500 mt-1 font-light leading-relaxed">Visit a local landmark or museum you've both lived near but never actually visited.</p>
          </div>
        </motion.div>
      </div>

      {/* Memories Section */}
      <div className="space-y-4 mt-12">
        <div className="flex items-center justify-between">
          <h3 className="font-cursive text-3xl text-stone-800">Memories</h3>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsAddingMemory(true)}
            className="p-2 bg-stone-100 text-stone-700 rounded-full hover:bg-stone-200 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {memories.map(memory => (
            <motion.div whileHover={{ y: -2 }} key={memory.id} className="bg-white rounded-2xl p-2 card-shadow border border-stone-100 flex flex-col">
              <div className="aspect-[4/5] rounded-xl overflow-hidden mb-2 bg-stone-100">
                <img src={memory.imageUrl} alt={memory.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="px-1 pb-1">
                <h4 className="font-medium text-stone-800 text-sm truncate">{memory.title}</h4>
                <p className="text-[10px] text-stone-400 font-light">{memory.date}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add Memory Modal */}
      <AnimatePresence>
        {isAddingMemory && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-[#fafafa] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsAddingMemory(false)} className="text-stone-400 hover:text-stone-600 p-2 -ml-2">
                <X className="w-5 h-5" />
              </motion.button>
              <h2 className="font-cursive text-3xl text-stone-800">New Memory</h2>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveMemory} className="text-stone-900 font-medium text-sm px-4 py-2 bg-stone-100 rounded-full">Save</motion.button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 bg-white mt-2 rounded-t-3xl shadow-sm">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-700">Photo</label>
                {newMemory.imageUrl ? (
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100 border border-stone-100">
                    <img src={newMemory.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setNewMemory({...newMemory, imageUrl: ''})}
                      className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-md rounded-full text-stone-700 hover:bg-white transition-colors shadow-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-square rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-stone-50 transition-colors text-stone-400 hover:text-stone-600">
                    <Camera className="w-8 h-8" />
                    <span className="text-sm font-medium">Tap to upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-stone-700">Title</label>
                <input 
                  type="text" 
                  placeholder="e.g., Picnic at the park" 
                  value={newMemory.title}
                  onChange={(e) => setNewMemory({...newMemory, title: e.target.value})}
                  className="text-lg font-medium text-stone-800 placeholder-stone-300 focus:outline-none bg-transparent border-b border-stone-100 pb-2"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderJournal = () => (
    <motion.div 
      key="journal"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="p-6 pb-24 h-full flex flex-col"
    >
      <div className="space-y-1 mb-8">
        <h1 className="font-cursive text-5xl text-stone-900 tracking-tight">Journal</h1>
        <p className="text-stone-500 text-sm font-light">Reflect on your journey together.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {journals.map((entry) => (
          <motion.div whileHover={{ y: -2 }} key={entry.id} className="bg-white rounded-3xl p-6 card-shadow border border-stone-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-medium text-stone-800 text-lg">{entry.title}</h3>
                <p className="text-xs text-stone-400 mt-1 font-light">{entry.date}</p>
              </div>
              <span className="text-2xl">{entry.mood}</span>
            </div>
            <p className="text-stone-600 text-sm leading-relaxed font-light">{entry.content}</p>
          </motion.div>
        ))}
      </div>

      {/* Floating Action Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAddingJournal(true)}
        className="absolute bottom-24 right-6 w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors z-10"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Add Journal Modal */}
      <AnimatePresence>
        {isAddingJournal && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute inset-0 bg-[#fafafa] z-50 flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
              <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsAddingJournal(false)} className="text-stone-400 hover:text-stone-600 p-2 -ml-2">
                <X className="w-5 h-5" />
              </motion.button>
              <h2 className="font-cursive text-3xl text-stone-800">New Entry</h2>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveJournal} className="text-stone-900 font-medium text-sm px-4 py-2 bg-stone-100 rounded-full">Save</motion.button>
            </div>
            <div className="p-6 flex-1 flex flex-col gap-6 bg-white mt-2 rounded-t-3xl shadow-sm">
              <div className="flex gap-2 mb-2">
                {['😊', '🥰', '😌', '😔', '😡'].map(emoji => (
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    key={emoji}
                    onClick={() => setNewJournal({...newJournal, mood: emoji})}
                    className={`text-2xl p-3 rounded-2xl transition-colors ${newJournal.mood === emoji ? 'bg-stone-100' : 'hover:bg-stone-50 border border-transparent'}`}
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Title" 
                value={newJournal.title}
                onChange={(e) => setNewJournal({...newJournal, title: e.target.value})}
                className="text-2xl font-medium text-stone-800 placeholder-stone-300 focus:outline-none bg-transparent"
              />
              <textarea 
                placeholder="Write your thoughts here..." 
                value={newJournal.content}
                onChange={(e) => setNewJournal({...newJournal, content: e.target.value})}
                className="flex-1 resize-none text-stone-600 placeholder-stone-300 focus:outline-none leading-relaxed font-light bg-transparent"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderConflicts = () => (
    <motion.div 
      key="conflicts"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-full"
    >
      <div className="p-6 pb-2 space-y-1 shrink-0">
        <h1 className="font-cursive text-5xl text-stone-900 tracking-tight">Conflicts</h1>
        <p className="text-stone-500 text-sm font-light">A safe space to discuss and resolve.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-32">
        {messages.map((msg) => (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : msg.sender === 'partner' ? 'justify-start' : 'justify-center'}`}>
            {msg.sender === 'ai' ? (
              <div className="bg-stone-50 border border-stone-100 rounded-3xl p-5 max-w-[85%] text-center shadow-sm">
                <Sparkles className="w-5 h-5 text-stone-400 mx-auto mb-3" />
                <p className="text-stone-700 text-sm leading-relaxed font-light">{msg.text}</p>
              </div>
            ) : (
              <div className={`max-w-[80%] rounded-3xl p-4 shadow-sm ${msg.sender === 'me' ? 'bg-stone-900 text-white rounded-br-sm' : 'bg-white border border-stone-100 text-stone-800 rounded-bl-sm'}`}>
                <p className="text-sm leading-relaxed font-light">{msg.text}</p>
                <span className={`text-[10px] mt-2 block ${msg.sender === 'me' ? 'text-stone-400' : 'text-stone-400'}`}>{msg.timestamp}</span>
              </div>
            )}
          </motion.div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="absolute bottom-20 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-stone-100 p-4 z-20">
        <div className="flex justify-center mb-3">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleGetAiSuggestion}
            disabled={isAiLoading}
            className="flex items-center gap-2 bg-stone-50 text-stone-700 px-5 py-2 rounded-full text-xs font-medium hover:bg-stone-100 transition-colors disabled:opacity-50 border border-stone-100"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isAiLoading ? 'Thinking...' : 'Get AI Mediator Suggestion'}
          </motion.button>
        </div>
        <div className="flex items-end gap-2 relative">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setCurrentSender(currentSender === 'me' ? 'partner' : 'me')}
            className={`shrink-0 p-3.5 rounded-2xl transition-colors relative ${currentSender === 'me' ? 'bg-stone-100 text-stone-800' : 'bg-stone-50 text-stone-500 border border-stone-100'}`}
            title={`Currently typing as: ${currentSender === 'me' ? 'Me' : 'Partner'}`}
          >
            <User className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-stone-100">
              {currentSender === 'me' ? 'M' : 'P'}
            </span>
          </motion.button>
          <div className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl flex items-center pr-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={`Type as ${currentSender === 'me' ? 'Me' : 'Partner'}...`}
              className="w-full bg-transparent border-none focus:outline-none py-3.5 px-4 text-sm text-stone-800 placeholder-stone-400 font-light"
            />
            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="shrink-0 p-2.5 bg-stone-900 text-white rounded-xl disabled:opacity-50 disabled:bg-stone-200 transition-colors"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderGoals = () => (
    <motion.div 
      key="goals"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="p-6 pb-24 space-y-8"
    >
      <div className="space-y-1 mb-6">
        <h1 className="font-cursive text-5xl text-stone-900 tracking-tight">Goals</h1>
        <p className="text-stone-500 text-sm font-light">Build your future, step by step.</p>
      </div>

      <div className="space-y-4">
        {goals.map((goal) => {
          const completedSteps = goal.steps.filter(s => s.completed).length;
          const totalSteps = goal.steps.length;
          const progress = totalSteps === 0 ? 0 : (completedSteps / totalSteps) * 100;
          const isExpanded = expandedGoalId === goal.id;

          return (
            <motion.div whileHover={{ y: -2 }} key={goal.id} className="bg-white rounded-3xl card-shadow border border-stone-100 overflow-hidden transition-all">
              <div 
                className="p-6 cursor-pointer flex items-center justify-between"
                onClick={() => setExpandedGoalId(isExpanded ? null : goal.id)}
              >
                <div className="flex-1">
                  <h3 className="font-medium text-stone-800 mb-2">{goal.title}</h3>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-stone-800 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-stone-400 font-medium w-8">{Math.round(progress)}%</span>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-stone-300 transition-transform duration-300 ml-4 ${isExpanded ? 'rotate-90' : ''}`} />
              </div>

              <AnimatePresence>
              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-6 pb-6 pt-2 border-t border-stone-50 bg-stone-50/50 overflow-hidden">
                  <p className="text-sm text-stone-500 mb-4 font-light leading-relaxed">{goal.description}</p>
                  <div className="space-y-3">
                    {goal.steps.map(step => (
                      <div 
                        key={step.id} 
                        className="flex items-start gap-3 cursor-pointer group"
                        onClick={() => toggleGoalStep(goal.id, step.id)}
                      >
                        <button className="mt-0.5 flex-shrink-0 text-stone-800 transition-colors">
                          {step.completed ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : (
                            <Circle className="w-5 h-5 text-stone-300 group-hover:text-stone-400" />
                          )}
                        </button>
                        <div className="flex-1">
                          <span className={`text-sm leading-snug transition-colors font-light ${step.completed ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                            {step.text}
                          </span>
                          {step.dueDate && (
                            <div className={`text-[10px] mt-0.5 ${step.completed ? 'text-stone-300' : 'text-stone-400'}`}>
                              Due: {new Date(step.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <motion.button 
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsAddingGoal(true)}
        className="absolute bottom-24 right-6 w-14 h-14 bg-stone-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-stone-800 transition-colors z-10"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Add Goal Modal */}
      <AnimatePresence>
      {isAddingGoal && (
        <motion.div 
          initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute inset-0 bg-[#fafafa] z-50 flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsAddingGoal(false)} className="text-stone-400 hover:text-stone-600 p-2 -ml-2">
              <X className="w-5 h-5" />
            </motion.button>
            <h2 className="font-cursive text-3xl text-stone-800">New Goal</h2>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSaveGoal} className="text-stone-900 font-medium text-sm px-4 py-2 bg-stone-100 rounded-full">Save</motion.button>
          </div>
          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4 bg-white mt-2 rounded-t-3xl shadow-sm">
            <input 
              type="text" 
              placeholder="Goal Title" 
              value={newGoal.title}
              onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
              className="text-2xl font-medium text-stone-800 placeholder-stone-300 focus:outline-none bg-transparent"
            />
            <textarea 
              placeholder="Why is this important to us?" 
              value={newGoal.description}
              onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
              className="resize-none h-20 text-stone-600 placeholder-stone-300 focus:outline-none leading-relaxed font-light bg-transparent"
            />
            
            <div className="mt-4">
              <h3 className="font-medium text-stone-800 mb-3">Action Steps</h3>
              <div className="space-y-3">
                {newGoal.steps.map((step, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Circle className="w-5 h-5 text-stone-300 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder={`Step ${index + 1}`}
                        value={step.text}
                        onChange={(e) => handleStepChange(index, 'text', e.target.value)}
                        className="flex-1 text-sm text-stone-700 placeholder-stone-300 focus:outline-none border-b border-stone-100 pb-1 font-light bg-transparent"
                      />
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveStep(index)}
                        className="text-stone-300 hover:text-stone-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <div className="pl-7">
                      <input
                        type="date"
                        value={step.dueDate}
                        onChange={(e) => handleStepChange(index, 'dueDate', e.target.value)}
                        className="text-xs text-stone-500 bg-transparent focus:outline-none border-b border-stone-100 pb-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={handleAddStep}
                className="mt-4 flex items-center gap-2 text-sm text-stone-600 font-medium hover:text-stone-800 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Step
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="bg-stone-900 min-h-screen flex items-center justify-center p-0 sm:p-4">
      {/* Mobile Device Container */}
      <div className="w-full h-full sm:w-[390px] sm:h-[844px] bg-[#f5f5f0] sm:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col border-0 sm:border-[8px] border-stone-800">
        
        {/* Settings Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsSettingsOpen(true)}
          className="absolute top-6 right-6 z-40 p-2 bg-white/80 backdrop-blur-md rounded-full shadow-sm text-stone-600 hover:text-stone-900 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </motion.button>

        {/* Main Scrollable Area */}
        <div className="flex-1 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {activeTab === 'insights' && renderInsights()}
            {activeTab === 'conflicts' && renderConflicts()}
            {activeTab === 'dates' && renderDates()}
            {activeTab === 'journal' && renderJournal()}
            {activeTab === 'goals' && renderGoals()}
          </AnimatePresence>
        </div>

        {/* Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div 
              initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-0 bg-[#fafafa] z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-white">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-600 p-2 -ml-2">
                  <X className="w-5 h-5" />
                </motion.button>
                <h2 className="font-cursive text-3xl text-stone-800">Settings</h2>
                <div className="w-9" /> {/* Spacer for centering */}
              </div>
              <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-6 bg-white mt-2 rounded-t-3xl shadow-sm">
                
                <div className="flex flex-col gap-4">
                  <h3 className="font-medium text-stone-800">Notifications</h3>
                  
                  <div className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl shadow-sm text-stone-600">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-stone-800 text-sm">Goal Reminders</p>
                        <p className="text-xs text-stone-500 mt-0.5">Get notified about upcoming and overdue steps.</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleToggleNotifications}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notificationsEnabled ? 'bg-stone-800' : 'bg-stone-200'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-stone-100 pb-safe pt-2 px-6 ios-shadow z-40">
          <div className="flex justify-between items-center pb-6 pt-2 px-2">
            <button 
              onClick={() => setActiveTab('insights')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'insights' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Heart className={`w-6 h-6 ${activeTab === 'insights' ? 'fill-stone-900/10' : ''}`} />
              <span className="text-[10px] font-medium">Insights</span>
            </button>
            <button 
              onClick={() => setActiveTab('conflicts')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'conflicts' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <MessageCircle className={`w-6 h-6 ${activeTab === 'conflicts' ? 'fill-stone-900/10' : ''}`} />
              <span className="text-[10px] font-medium">Conflicts</span>
            </button>
            <button 
              onClick={() => setActiveTab('dates')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dates' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <CalendarHeart className={`w-6 h-6 ${activeTab === 'dates' ? 'fill-stone-900/10' : ''}`} />
              <span className="text-[10px] font-medium">Dates</span>
            </button>
            <button 
              onClick={() => setActiveTab('journal')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'journal' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <BookOpen className={`w-6 h-6 ${activeTab === 'journal' ? 'fill-stone-900/10' : ''}`} />
              <span className="text-[10px] font-medium">Journal</span>
            </button>
            <button 
              onClick={() => setActiveTab('goals')}
              className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'goals' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'}`}
            >
              <Target className={`w-6 h-6 ${activeTab === 'goals' ? 'fill-stone-900/10' : ''}`} />
              <span className="text-[10px] font-medium">Goals</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
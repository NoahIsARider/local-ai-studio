import { AppProvider, useAppState } from './store';
import { Layout } from './components/layout/Layout';
import TextWorkbench from './pages/TextWorkbench';
import VoiceTranscription from './pages/VoiceTranscription';
import VisualUnderstanding from './pages/VisualUnderstanding';
import LocalRAG from './pages/LocalRAG';
import ModelManager from './pages/ModelManager';

function ModuleRouter() {
  const { activeModule } = useAppState();

  switch (activeModule) {
    case 'text':
      return <TextWorkbench />;
    case 'voice':
      return <VoiceTranscription />;
    case 'vision':
      return <VisualUnderstanding />;
    case 'rag':
      return <LocalRAG />;
    case 'models':
      return <ModelManager />;
    default:
      return <TextWorkbench />;
  }
}

function AppContent() {
  return (
    <Layout>
      <ModuleRouter />
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

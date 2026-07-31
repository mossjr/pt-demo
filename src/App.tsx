import React, { useEffect, useState } from 'react';
import { LoginScreen } from './components/LoginScreen';
import { Header } from './components/Header';
import { ModuleHub } from './components/ModuleHub';
import { DummyModuleModal } from './components/DummyModuleModal';
import { SalesPipelineModule } from './components/SalesPipeline/SalesPipelineModule';
import { ModuleInfo } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
  const [selectedDummyModule, setSelectedDummyModule] = useState<ModuleInfo | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem('pt_auth_token');
    if (token === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('pt_auth_token');
    setIsAuthenticated(false);
    setCurrentModuleId(null);
  };

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={handleLoginSuccess} />;
  }

  const currentModuleName =
    currentModuleId === 'sales-pipeline' ? 'Sales Pipeline Analysis' : null;

  return (
    <div className="min-h-screen bg-[#07132a] text-slate-100 flex flex-col font-sans selection:bg-[#3f7abb] selection:text-white">
      <Header
        currentModule={currentModuleName}
        onBackToHub={() => setCurrentModuleId(null)}
        onLogout={handleLogout}
      />

      <main className="flex-1 pb-12">
        {currentModuleId === 'sales-pipeline' ? (
          <SalesPipelineModule onBackToHub={() => setCurrentModuleId(null)} />
        ) : (
          <ModuleHub
            onSelectModule={(id) => setCurrentModuleId(id)}
            onSelectDummyModule={(module) => setSelectedDummyModule(module)}
          />
        )}
      </main>

      {/* Dummy Module Preview Modal */}
      <DummyModuleModal
        module={selectedDummyModule}
        onClose={() => setSelectedDummyModule(null)}
        onLaunchActive={() => {
          setSelectedDummyModule(null);
          setCurrentModuleId('sales-pipeline');
        }}
      />
    </div>
  );
}

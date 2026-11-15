import React, { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Copy,
  Trash2,
  Download,
  Upload,
  X,
  Check,
} from 'lucide-react';
import { StudioProject } from '../types/studio';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: StudioProject[];
  activeProjectId: string;
  onSelectProject: (project: StudioProject) => void;
  onCreateNewProject: (name: string) => void;
  onDuplicateProject: (project: StudioProject) => void;
  onDeleteProject: (id: string) => void;
  onImportProjectJson: (project: StudioProject) => void;
}

export const ProjectsModal: React.FC<ProjectsModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onCreateNewProject,
  onDuplicateProject,
  onDeleteProject,
  onImportProjectJson,
}) => {
  const [newProjectName, setNewProjectName] = useState('');

  if (!isOpen) return null;

  const handleExportJson = (proj: StudioProject) => {
    const json = JSON.stringify(proj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proj.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.mockupforge.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-6 select-none">
      <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-[#0D121D] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Saved Projects & Workspaces
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-center gap-2.5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="New project name (e.g. PulsePay iOS 17 Launch)..."
              className="flex-1 min-w-[220px] px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => {
                onCreateNewProject(
                  newProjectName.trim() || `App Launch Campaign #${projects.length + 1}`
                );
                setNewProjectName('');
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>

            <label className="px-3.5 py-2 rounded-lg bg-slate-200/80 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Import JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    try {
                      const parsed = JSON.parse(String(reader.result)) as StudioProject;
                      if (parsed && Array.isArray(parsed.slides)) {
                        onImportProjectJson(parsed);
                        onClose();
                      }
                    } catch {
                      // ignore invalid file
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-2.5">
            {projects.map((proj) => {
              const isCurrent = proj.id === activeProjectId;
              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${
                    isCurrent
                      ? 'bg-indigo-50/70 dark:bg-indigo-600/15 border-indigo-500'
                      : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {proj.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                      <span>{proj.slides.length} Screenshot Slides</span>
                      <span>·</span>
                      <span>1 Featured Graphic</span>
                      <span>·</span>
                      <span className="tabular-nums">
                        Updated{' '}
                        {new Date(proj.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectProject(proj);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        Open
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDuplicateProject(proj)}
                      title="Duplicate Project"
                      className="p-2 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExportJson(proj)}
                      title="Download Project File (.json)"
                      className="p-2 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteProject(proj.id)}
                        title="Delete Project"
                        className="p-2 rounded-lg bg-slate-200/70 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

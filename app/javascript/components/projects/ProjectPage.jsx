import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useProjectStore from '../../stores/projectStore';
import { projectsApi, sectionsApi, projectTasksApi } from '../../utils/api';
import TaskDetailModal from './TaskDetailModal';

// v2 style helpers
const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface)',
  color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none',
};
const inputSmStyle = { ...inputStyle, padding: '6px 10px', fontSize: '0.833rem' };

const ProjectPage = ({ projectId }) => {
  const queryClient = useQueryClient();
  const queryKey = ['project', projectId];

  const {
    viewMode, setViewMode, taskFilter, setTaskFilter, searchQuery, setSearchQuery,
    taskModal, openTaskModal, closeTaskModal,
    projectEditModal, openProjectEditModal, closeProjectEditModal,
    addingTaskSectionId, setAddingTaskSectionId,
    addingSubtaskId, setAddingSubtaskId,
    expandedTasks, toggleTaskExpanded, setTaskExpanded,
    editingSectionId, setEditingSectionId,
  } = useProjectStore();

  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [newTaskName, setNewTaskName] = useState('');
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [showNewSection, setShowNewSection] = useState(false);
  const [sectionRename, setSectionRename] = useState('');

  // --- Data fetching ---
  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: () => projectsApi.fetchOne(projectId),
  });

  // --- Helper: optimistic cache update ---
  const optimistic = (updater) => {
    queryClient.setQueryData(queryKey, (old) => old ? updater(structuredClone(old)) : old);
  };

  // --- Mutations with optimistic updates ---
  const updateProjectMut = useMutation({
    mutationFn: (updates) => projectsApi.update(projectId, updates),
    onMutate: (updates) => {
      const prev = queryClient.getQueryData(queryKey);
      optimistic((d) => { Object.assign(d.project, updates); return d; });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createSectionMut = useMutation({
    mutationFn: (name) => sectionsApi.create(projectId, { name }),
    onMutate: (name) => {
      const prev = queryClient.getQueryData(queryKey);
      const tempId = `temp-${Date.now()}`;
      optimistic((d) => {
        d.sections.push({ id: tempId, name, position: d.sections.length + 1, project_tasks: [] });
        return d;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateSectionMut = useMutation({
    mutationFn: ({ sectionId, updates }) => sectionsApi.update(projectId, sectionId, updates),
    onMutate: ({ sectionId, updates }) => {
      const prev = queryClient.getQueryData(queryKey);
      optimistic((d) => {
        const sec = d.sections.find((s) => s.id === sectionId);
        if (sec) Object.assign(sec, updates);
        return d;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteSectionMut = useMutation({
    mutationFn: (sectionId) => sectionsApi.delete(projectId, sectionId),
    onMutate: (sectionId) => {
      const prev = queryClient.getQueryData(queryKey);
      optimistic((d) => { d.sections = d.sections.filter((s) => s.id !== sectionId); return d; });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const createTaskMut = useMutation({
    mutationFn: ({ sectionId, name, parentId }) =>
      projectTasksApi.create(projectId, sectionId, { name, parent_id: parentId || null }),
    onMutate: ({ sectionId, name, parentId }) => {
      const prev = queryClient.getQueryData(queryKey);
      const tempId = `temp-${Date.now()}`;
      optimistic((d) => {
        const sec = d.sections.find((s) => s.id === sectionId);
        if (!sec) return d;
        const newTask = { id: tempId, name, description: null, completed: false, completed_at: null, due_date: null, position: 0, subtasks: [] };
        if (parentId) {
          const parent = sec.project_tasks.find((t) => t.id === parentId);
          if (parent) {
            parent.subtasks = parent.subtasks || [];
            parent.subtasks.push(newTask);
          }
        } else {
          sec.project_tasks.push(newTask);
        }
        return d;
      });
      if (parentId) setTaskExpanded(parentId, true);
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateTaskMut = useMutation({
    mutationFn: ({ taskId, updates }) => projectTasksApi.update(taskId, updates),
    onMutate: ({ taskId, updates }) => {
      const prev = queryClient.getQueryData(queryKey);
      optimistic((d) => {
        for (const sec of d.sections) {
          const task = sec.project_tasks.find((t) => t.id === taskId);
          if (task) { Object.assign(task, updates); return d; }
          for (const t of sec.project_tasks) {
            const sub = t.subtasks?.find((s) => s.id === taskId);
            if (sub) { Object.assign(sub, updates); return d; }
          }
        }
        return d;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteTaskMut = useMutation({
    mutationFn: (taskId) => projectTasksApi.delete(taskId),
    onMutate: (taskId) => {
      const prev = queryClient.getQueryData(queryKey);
      optimistic((d) => {
        for (const sec of d.sections) {
          const idx = sec.project_tasks.findIndex((t) => t.id === taskId);
          if (idx !== -1) { sec.project_tasks.splice(idx, 1); return d; }
          for (const t of sec.project_tasks) {
            if (t.subtasks) {
              const si = t.subtasks.findIndex((s) => s.id === taskId);
              if (si !== -1) { t.subtasks.splice(si, 1); return d; }
            }
          }
        }
        return d;
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev); },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  // --- Filter tasks ---
  const filterTasks = (tasks) => {
    let filtered = tasks;
    if (taskFilter === 'active') filtered = filtered.filter((t) => !t.completed);
    else if (taskFilter === 'completed') filtered = filtered.filter((t) => t.completed);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return filtered;
  };

  // --- Find task by ID across all sections (for modal) ---
  const findTask = (taskId) => {
    if (!data) return null;
    for (const sec of data.sections) {
      const task = sec.project_tasks.find((t) => t.id === taskId);
      if (task) return { task, section: sec };
      for (const t of sec.project_tasks) {
        const sub = t.subtasks?.find((s) => s.id === taskId);
        if (sub) return { task: sub, section: sec, parentTask: t };
      }
    }
    return null;
  };

  // --- Loading / Error ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ink-faint)' }} />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="v2-small" style={{ color: 'var(--overdue)' }}>Failed to load project.</p>
      </div>
    );
  }

  const { project, sections } = data;

  // --- Counts ---
  const totalTasks = sections.reduce((sum, s) => sum + s.project_tasks.length, 0);
  const completedTasks = sections.reduce((sum, s) => sum + s.project_tasks.filter((t) => t.completed).length, 0);

  return (
    <div className="pl-14 pr-4 pt-6 pb-8 md:pl-8 md:pr-8 md:pt-8" style={{ minHeight: '100vh' }}>
      {/* Project Header */}
      <div style={{ marginBottom: 24 }}>
        {projectEditModal.isOpen ? (
          <div className="v2-card v2-card-padded" style={{ maxWidth: 480 }}>
            <input
              type="text" value={projectForm.name}
              onChange={(e) => setProjectForm((f) => ({ ...f, name: e.target.value }))}
              style={{ ...inputStyle, fontSize: '1.2rem', fontWeight: 600, marginBottom: 10 }}
              autoFocus
            />
            <textarea
              value={projectForm.description}
              onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
              style={{ ...inputStyle, marginBottom: 12, resize: 'none' }}
              rows={2} placeholder="Project description..."
            />
            <div className="flex gap-2">
              <button onClick={() => { updateProjectMut.mutate(projectForm); closeProjectEditModal(); }} className="v2-btn v2-btn-primary">Save</button>
              <button onClick={closeProjectEditModal} className="v2-btn v2-btn-secondary">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: project.color }}
            >
              <i className={`fa-solid ${project.icon} text-white`} style={{ fontSize: '1rem' }} />
            </div>
            <div className="flex-1">
              <h1
                className="v2-h1 cursor-pointer hover:opacity-80 transition"
                onClick={() => { setProjectForm({ name: project.name, description: project.description || '' }); openProjectEditModal(); }}
              >{project.name}</h1>
              {project.description && (
                <p className="v2-small" style={{ marginTop: 2, color: 'var(--ink-tertiary)' }}>{project.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 16 }}>
        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setViewMode('board')}
            className="px-3 py-1.5 text-xs transition"
            style={{
              fontFamily: 'var(--font-body)', fontWeight: 500,
              background: viewMode === 'board' ? 'var(--ink)' : 'var(--surface)',
              color: viewMode === 'board' ? 'var(--bg)' : 'var(--ink-secondary)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-columns mr-1.5" style={{ fontSize: '0.65rem' }} />Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className="px-3 py-1.5 text-xs transition"
            style={{
              fontFamily: 'var(--font-body)', fontWeight: 500,
              background: viewMode === 'list' ? 'var(--ink)' : 'var(--surface)',
              color: viewMode === 'list' ? 'var(--bg)' : 'var(--ink-secondary)',
              border: 'none', cursor: 'pointer',
            }}
          >
            <i className="fa-solid fa-list mr-1.5" style={{ fontSize: '0.65rem' }} />List
          </button>
        </div>

        {/* Filter */}
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {['active', 'completed', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setTaskFilter(f)}
              className="px-3 py-1.5 text-xs transition capitalize"
              style={{
                fontFamily: 'var(--font-body)', fontWeight: 450,
                background: taskFilter === f ? 'var(--hover-tint-strong)' : 'var(--surface)',
                color: taskFilter === f ? 'var(--ink)' : 'var(--ink-tertiary)',
                border: 'none', cursor: 'pointer',
              }}
            >{f}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', maxWidth: 200 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', color: 'var(--ink-faint)' }} />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            style={{ ...inputSmStyle, paddingLeft: 28, width: 200 }}
          />
        </div>

        {/* Progress */}
        <div className="ml-auto flex items-center gap-2">
          <span className="v2-caption" style={{ color: 'var(--ink-tertiary)' }}>{completedTasks}/{totalTasks} done</span>
          <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--border)' }}>
            <div style={{ width: totalTasks > 0 ? `${(completedTasks / totalTasks) * 100}%` : '0%', height: '100%', borderRadius: 2, background: project.color, transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' && (
        <div className="flex gap-5 overflow-x-auto pb-6" style={{ minHeight: 'calc(100vh - 240px)' }}>
          {sections.map((section) => (
            <SectionColumn
              key={section.id}
              section={section}
              project={project}
              tasks={filterTasks(section.project_tasks)}
              expandedTasks={expandedTasks}
              toggleTaskExpanded={toggleTaskExpanded}
              addingTaskSectionId={addingTaskSectionId}
              setAddingTaskSectionId={setAddingTaskSectionId}
              addingSubtaskId={addingSubtaskId}
              setAddingSubtaskId={setAddingSubtaskId}
              newTaskName={newTaskName}
              setNewTaskName={setNewTaskName}
              newSubtaskName={newSubtaskName}
              setNewSubtaskName={setNewSubtaskName}
              editingSectionId={editingSectionId}
              setEditingSectionId={setEditingSectionId}
              sectionRename={sectionRename}
              setSectionRename={setSectionRename}
              onCreateTask={(sectionId, name, parentId) => createTaskMut.mutate({ sectionId, name, parentId })}
              onUpdateTask={(taskId, updates) => updateTaskMut.mutate({ taskId, updates })}
              onDeleteTask={(taskId) => deleteTaskMut.mutate(taskId)}
              onUpdateSection={(sectionId, updates) => updateSectionMut.mutate({ sectionId, updates })}
              onDeleteSection={(sectionId) => deleteSectionMut.mutate(sectionId)}
              onOpenTaskModal={openTaskModal}
            />
          ))}

          {/* Add Section */}
          {showNewSection ? (
            <div className="flex-shrink-0 v2-card v2-card-padded" style={{ width: 340 }}>
              <input
                type="text" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionName.trim()) { createSectionMut.mutate(newSectionName.trim()); setNewSectionName(''); setShowNewSection(false); }
                  if (e.key === 'Escape') setShowNewSection(false);
                }}
                style={{ ...inputStyle, fontWeight: 500, marginBottom: 12 }} placeholder="Section name..." autoFocus
              />
              <div className="flex gap-2">
                <button onClick={() => { if (newSectionName.trim()) { createSectionMut.mutate(newSectionName.trim()); setNewSectionName(''); setShowNewSection(false); } }} className="v2-btn v2-btn-primary">Add Section</button>
                <button onClick={() => setShowNewSection(false)} className="v2-btn v2-btn-ghost">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setShowNewSection(true); setNewSectionName(''); }}
              className="flex-shrink-0 flex items-center justify-center transition"
              style={{ width: 340, minHeight: 120, borderRadius: 10, border: '2px dashed var(--border)', color: 'var(--ink-faint)', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.867rem' }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: '0.7rem' }} />Add Section
            </button>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div style={{ maxWidth: 720 }}>
          {sections.map((section) => (
            <div key={section.id} style={{ marginBottom: 24 }}>
              <div className="flex items-center gap-2" style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.867rem', fontWeight: 600, color: 'var(--ink)' }}>{section.name}</span>
                <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{filterTasks(section.project_tasks).length}</span>
                <button onClick={() => { setAddingTaskSectionId(section.id); setNewTaskName(''); }} className="v2-btn-icon-sm ml-auto" title="Add task">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                </button>
              </div>

              <div className="space-y-1">
                {filterTasks(section.project_tasks).map((task) => (
                  <ListTaskRow
                    key={task.id}
                    task={task}
                    project={project}
                    section={section}
                    expandedTasks={expandedTasks}
                    toggleTaskExpanded={toggleTaskExpanded}
                    addingSubtaskId={addingSubtaskId}
                    setAddingSubtaskId={setAddingSubtaskId}
                    newSubtaskName={newSubtaskName}
                    setNewSubtaskName={setNewSubtaskName}
                    onUpdateTask={(taskId, updates) => updateTaskMut.mutate({ taskId, updates })}
                    onDeleteTask={(taskId) => deleteTaskMut.mutate(taskId)}
                    onCreateTask={(sectionId, name, parentId) => createTaskMut.mutate({ sectionId, name, parentId })}
                    onOpenTaskModal={openTaskModal}
                  />
                ))}
              </div>

              {addingTaskSectionId === section.id && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTaskName.trim()) { createTaskMut.mutate({ sectionId: section.id, name: newTaskName.trim() }); setNewTaskName(''); setAddingTaskSectionId(null); }
                      if (e.key === 'Escape') setAddingTaskSectionId(null);
                    }}
                    style={{ ...inputSmStyle, flex: 1 }} placeholder="Task name..." autoFocus
                  />
                  <button onClick={() => { if (newTaskName.trim()) { createTaskMut.mutate({ sectionId: section.id, name: newTaskName.trim() }); setNewTaskName(''); setAddingTaskSectionId(null); } }} className="v2-btn-sm v2-btn-primary">Add</button>
                  <button onClick={() => setAddingTaskSectionId(null)} className="v2-btn-sm v2-btn-ghost">Cancel</button>
                </div>
              )}
            </div>
          ))}

          {/* Add Section */}
          {showNewSection ? (
            <div className="flex gap-2 mt-2" style={{ maxWidth: 400 }}>
              <input
                type="text" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSectionName.trim()) { createSectionMut.mutate(newSectionName.trim()); setNewSectionName(''); setShowNewSection(false); }
                  if (e.key === 'Escape') setShowNewSection(false);
                }}
                style={{ ...inputSmStyle, flex: 1, fontWeight: 500 }} placeholder="Section name..." autoFocus
              />
              <button onClick={() => { if (newSectionName.trim()) { createSectionMut.mutate(newSectionName.trim()); setNewSectionName(''); setShowNewSection(false); } }} className="v2-btn-sm v2-btn-primary">Add</button>
              <button onClick={() => setShowNewSection(false)} className="v2-btn-sm v2-btn-ghost">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => { setShowNewSection(true); setNewSectionName(''); }}
              style={{ marginTop: 4, padding: '8px 0', fontSize: '0.833rem', fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
              className="hover:opacity-80 transition"
            >
              <i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: '0.65rem' }} />Add section
            </button>
          )}
        </div>
      )}

      {/* Task Detail Modal */}
      {taskModal.isOpen && (() => {
        const found = findTask(taskModal.taskId);
        if (!found) return null;
        return (
          <TaskDetailModal
            task={found.task}
            section={found.section}
            parentTask={found.parentTask}
            project={project}
            sections={sections}
            onUpdate={(updates) => updateTaskMut.mutate({ taskId: taskModal.taskId, updates })}
            onDelete={() => { deleteTaskMut.mutate(taskModal.taskId); closeTaskModal(); }}
            onCreateSubtask={(name) => createTaskMut.mutate({ sectionId: found.section.id, name, parentId: taskModal.taskId })}
            onClose={closeTaskModal}
          />
        );
      })()}
    </div>
  );
};

// ── Section Column (Board View) ──
const SectionColumn = ({
  section, project, tasks,
  expandedTasks, toggleTaskExpanded,
  addingTaskSectionId, setAddingTaskSectionId,
  addingSubtaskId, setAddingSubtaskId,
  newTaskName, setNewTaskName,
  newSubtaskName, setNewSubtaskName,
  editingSectionId, setEditingSectionId,
  sectionRename, setSectionRename,
  onCreateTask, onUpdateTask, onDeleteTask,
  onUpdateSection, onDeleteSection, onOpenTaskModal,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex-shrink-0 v2-card flex flex-col" style={{ width: 340, padding: 0 }}>
      {/* Section Header */}
      <div className="v2-section-header" style={{ padding: '12px 14px 8px' }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editingSectionId === section.id ? (
            <input
              type="text" value={sectionRename} onChange={(e) => setSectionRename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && sectionRename.trim()) { onUpdateSection(section.id, { name: sectionRename.trim() }); setEditingSectionId(null); }
                if (e.key === 'Escape') setEditingSectionId(null);
              }}
              onBlur={() => { if (sectionRename.trim() && sectionRename.trim() !== section.name) onUpdateSection(section.id, { name: sectionRename.trim() }); setEditingSectionId(null); }}
              style={{ ...inputSmStyle, fontWeight: 600 }} autoFocus
            />
          ) : (
            <span
              className="v2-section-title cursor-pointer"
              onDoubleClick={() => { setSectionRename(section.name); setEditingSectionId(section.id); }}
            >{section.name}</span>
          )}
          <span className="v2-caption" style={{ color: 'var(--ink-faint)' }}>{tasks.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => { setAddingTaskSectionId(section.id); setNewTaskName(''); }} className="v2-btn-icon-sm" title="Add task">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowMenu((v) => !v)} className="v2-btn-icon-sm" title="Section options">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div
                  className="v2-card"
                  style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 20, padding: '4px 0', minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}
                >
                  <button
                    onClick={() => { setSectionRename(section.name); setEditingSectionId(section.id); setShowMenu(false); }}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2 transition"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-tint)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    Rename section
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); if (confirm('Archive this section and all its tasks?')) onDeleteSection(section.id); }}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2 transition"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.833rem', color: 'var(--overdue)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-tint)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Archive section
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tasks.map((task) => (
          <BoardTaskCard
            key={task.id}
            task={task}
            project={project}
            section={section}
            expandedTasks={expandedTasks}
            toggleTaskExpanded={toggleTaskExpanded}
            addingSubtaskId={addingSubtaskId}
            setAddingSubtaskId={setAddingSubtaskId}
            newSubtaskName={newSubtaskName}
            setNewSubtaskName={setNewSubtaskName}
            onUpdateTask={onUpdateTask}
            onDeleteTask={onDeleteTask}
            onCreateTask={onCreateTask}
            onOpenTaskModal={onOpenTaskModal}
          />
        ))}

        {/* Add Task */}
        {addingTaskSectionId === section.id ? (
          <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
            <input
              type="text" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTaskName.trim()) { onCreateTask(section.id, newTaskName.trim()); setNewTaskName(''); setAddingTaskSectionId(null); }
                if (e.key === 'Escape') setAddingTaskSectionId(null);
              }}
              style={{ ...inputSmStyle, marginBottom: 8 }} placeholder="Task name..." autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { if (newTaskName.trim()) { onCreateTask(section.id, newTaskName.trim()); setNewTaskName(''); setAddingTaskSectionId(null); } }} className="v2-btn-sm v2-btn-primary">Add Task</button>
              <button onClick={() => setAddingTaskSectionId(null)} className="v2-btn-sm v2-btn-ghost">Cancel</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAddingTaskSectionId(section.id); setNewTaskName(''); }}
            style={{ width: '100%', textAlign: 'left', padding: '8px 12px', borderRadius: 8, fontSize: '0.833rem', fontFamily: 'var(--font-body)', color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
            className="hover:bg-[var(--hover-tint)]"
          >
            <i className="fa-solid fa-plus" style={{ marginRight: 6, fontSize: '0.65rem' }} />Add task
          </button>
        )}
      </div>
    </div>
  );
};

// ── Task Card (Board View) ──
const BoardTaskCard = ({
  task, project, section,
  expandedTasks, toggleTaskExpanded,
  addingSubtaskId, setAddingSubtaskId,
  newSubtaskName, setNewSubtaskName,
  onUpdateTask, onDeleteTask, onCreateTask, onOpenTaskModal,
}) => {
  return (
    <div
      style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', transition: 'box-shadow 0.15s ease' }}
      className="hover:shadow-sm group"
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
          style={{
            marginTop: 2, width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${task.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
            background: task.completed ? 'var(--ink)' : 'transparent',
            transition: 'all 0.15s ease', cursor: 'pointer', padding: 0,
          }}
        >
          <i className="fa-solid fa-check" style={{ fontSize: '0.45rem', color: 'var(--check-ink)', opacity: task.completed ? 1 : 0 }} />
        </button>

        <div className="flex-1 min-w-0">
          <p
            className="cursor-pointer"
            style={{
              fontFamily: 'var(--font-body)', fontSize: '0.867rem', fontWeight: 450,
              color: 'var(--ink)', textDecoration: task.completed ? 'line-through' : 'none',
              textDecorationColor: 'var(--ink-faint)', opacity: task.completed ? 0.5 : 1,
            }}
            onClick={() => onOpenTaskModal(task.id, section.id)}
          >{task.name}</p>
          {task.description && (
            <p className="v2-caption" style={{ marginTop: 2, color: 'var(--ink-faint)' }}>{task.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {task.due_date && (
              <span className="v2-badge v2-badge-neutral" style={{ fontSize: '0.65rem', padding: '1px 7px' }}>
                {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.subtasks && task.subtasks.length > 0 && (
              <button onClick={() => toggleTaskExpanded(task.id)} className="v2-caption" style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <i className={`fa-solid fa-chevron-${expandedTasks[task.id] ? 'up' : 'down'}`} style={{ marginRight: 3, fontSize: '0.55rem' }} />
                {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setAddingSubtaskId(task.id); setNewSubtaskName(''); }} className="v2-btn-icon-sm" title="Add subtask">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button onClick={() => { if (confirm('Archive this task?')) onDeleteTask(task.id); }} className="v2-btn-icon-sm" title="Archive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {expandedTasks[task.id] && task.subtasks && task.subtasks.length > 0 && (
        <div style={{ marginTop: 8, marginLeft: 24, paddingLeft: 12, borderLeft: '2px solid var(--border)' }} className="space-y-1">
          {task.subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2 group/sub">
              <button
                onClick={() => onUpdateTask(sub.id, { completed: !sub.completed })}
                style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${sub.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
                  background: sub.completed ? 'var(--ink)' : 'transparent',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <i className="fa-solid fa-check" style={{ fontSize: '0.4rem', color: 'var(--check-ink)', opacity: sub.completed ? 1 : 0 }} />
              </button>
              <span style={{
                flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink)',
                textDecoration: sub.completed ? 'line-through' : 'none', textDecorationColor: 'var(--ink-faint)',
                opacity: sub.completed ? 0.5 : 1,
              }}>{sub.name}</span>
              <button onClick={() => { if (confirm('Archive?')) onDeleteTask(sub.id); }}
                className="v2-btn-icon-sm opacity-0 group-hover/sub:opacity-100 transition-opacity" style={{ width: 18, height: 18 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Subtask */}
      {addingSubtaskId === task.id && (
        <div className="flex gap-2" style={{ marginTop: 8, marginLeft: 24 }}>
          <input
            type="text" value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSubtaskName.trim()) { onCreateTask(section.id, newSubtaskName.trim(), task.id); setNewSubtaskName(''); setAddingSubtaskId(null); }
              if (e.key === 'Escape') setAddingSubtaskId(null);
            }}
            style={{ ...inputSmStyle, flex: 1 }} placeholder="Subtask name..." autoFocus
          />
          <button onClick={() => { if (newSubtaskName.trim()) { onCreateTask(section.id, newSubtaskName.trim(), task.id); setNewSubtaskName(''); setAddingSubtaskId(null); } }}
            className="v2-btn-sm v2-btn-primary">Add</button>
        </div>
      )}
    </div>
  );
};

// ── Task Row (List View) ──
const ListTaskRow = ({
  task, project, section,
  expandedTasks, toggleTaskExpanded,
  addingSubtaskId, setAddingSubtaskId,
  newSubtaskName, setNewSubtaskName,
  onUpdateTask, onDeleteTask, onCreateTask, onOpenTaskModal,
}) => {
  return (
    <div>
      <div
        className="flex items-center gap-3 py-1.5 px-2 rounded-lg group transition hover:bg-[var(--hover-tint)]"
        style={{ cursor: 'default' }}
      >
        <button
          onClick={() => onUpdateTask(task.id, { completed: !task.completed })}
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1.5px solid ${task.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
            background: task.completed ? 'var(--ink)' : 'transparent',
            cursor: 'pointer', padding: 0,
          }}
        >
          <i className="fa-solid fa-check" style={{ fontSize: '0.45rem', color: 'var(--check-ink)', opacity: task.completed ? 1 : 0 }} />
        </button>

        <span
          className="flex-1 cursor-pointer"
          style={{
            fontFamily: 'var(--font-body)', fontSize: '0.867rem', fontWeight: 450, color: 'var(--ink)',
            textDecoration: task.completed ? 'line-through' : 'none', textDecorationColor: 'var(--ink-faint)',
            opacity: task.completed ? 0.5 : 1,
          }}
          onClick={() => onOpenTaskModal(task.id, section.id)}
        >{task.name}</span>

        {task.due_date && (
          <span className="v2-caption" style={{ color: 'var(--ink-faint)', flexShrink: 0 }}>
            {new Date(task.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}

        {task.subtasks && task.subtasks.length > 0 && (
          <button onClick={() => toggleTaskExpanded(task.id)} className="v2-caption" style={{ color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <i className={`fa-solid fa-chevron-${expandedTasks[task.id] ? 'up' : 'down'}`} style={{ marginRight: 3, fontSize: '0.55rem' }} />
            {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
          </button>
        )}

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setAddingSubtaskId(task.id); setNewSubtaskName(''); }} className="v2-btn-icon-sm" title="Add subtask">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
          <button onClick={() => { if (confirm('Archive?')) onDeleteTask(task.id); }} className="v2-btn-icon-sm" title="Archive">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {expandedTasks[task.id] && task.subtasks && task.subtasks.length > 0 && (
        <div style={{ marginLeft: 36, borderLeft: '2px solid var(--border)', paddingLeft: 12 }} className="space-y-0.5">
          {task.subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-2.5 py-1 group/sub">
              <button
                onClick={() => onUpdateTask(sub.id, { completed: !sub.completed })}
                style={{
                  width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: `1.5px solid ${sub.completed ? 'var(--ink)' : 'var(--border-hover)'}`,
                  background: sub.completed ? 'var(--ink)' : 'transparent',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <i className="fa-solid fa-check" style={{ fontSize: '0.4rem', color: 'var(--check-ink)', opacity: sub.completed ? 1 : 0 }} />
              </button>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--ink)', textDecoration: sub.completed ? 'line-through' : 'none', opacity: sub.completed ? 0.5 : 1 }}>{sub.name}</span>
              <button onClick={() => { if (confirm('Archive?')) onDeleteTask(sub.id); }}
                className="v2-btn-icon-sm opacity-0 group-hover/sub:opacity-100 transition-opacity" style={{ width: 18, height: 18 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {addingSubtaskId === task.id && (
        <div className="flex gap-2" style={{ marginLeft: 36, marginTop: 4 }}>
          <input type="text" value={newSubtaskName} onChange={(e) => setNewSubtaskName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSubtaskName.trim()) { onCreateTask(section.id, newSubtaskName.trim(), task.id); setNewSubtaskName(''); setAddingSubtaskId(null); }
              if (e.key === 'Escape') setAddingSubtaskId(null);
            }}
            style={{ ...inputSmStyle, flex: 1 }} placeholder="Subtask name..." autoFocus
          />
          <button onClick={() => { if (newSubtaskName.trim()) { onCreateTask(section.id, newSubtaskName.trim(), task.id); setNewSubtaskName(''); setAddingSubtaskId(null); } }}
            className="v2-btn-sm v2-btn-primary">Add</button>
        </div>
      )}
    </div>
  );
};

export default ProjectPage;

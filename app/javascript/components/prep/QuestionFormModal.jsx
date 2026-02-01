import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { prepQuestionsApi } from '../../utils/api';
import usePrepStore from '../../stores/prepStore';
import SlideOverPanel from '../shared/SlideOverPanel';

const QUESTION_TYPES = [
  { value: 'short_answer', label: 'Short Answer', icon: 'fa-font', description: 'Single line text input' },
  { value: 'long_answer', label: 'Long Answer', icon: 'fa-align-left', description: 'Rich text editor' },
  { value: 'checkbox', label: 'Yes/No', icon: 'fa-toggle-on', description: 'Simple toggle' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: 'fa-list-ul', description: 'Select from options' },
];

const QuestionFormModal = ({ questions }) => {
  const queryClient = useQueryClient();
  const { formModal, closeFormModal } = usePrepStore();
  const { isOpen, mode, questionId } = formModal;

  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'short_answer',
    options: ['', ''],
    allow_multiple: false,
  });

  // Load question data when editing
  useEffect(() => {
    if (isOpen && mode === 'edit' && questionId && questions) {
      const question = questions.find(q => q.id === questionId);
      if (question) {
        setFormData({
          question_text: question.question_text || '',
          question_type: question.question_type || 'short_answer',
          options: question.options?.length > 0 ? question.options : ['', ''],
          allow_multiple: question.allow_multiple || false,
        });
      }
    } else if (isOpen && mode === 'new') {
      setFormData({
        question_text: '',
        question_type: 'short_answer',
        options: ['', ''],
        allow_multiple: false,
      });
    }
  }, [isOpen, mode, questionId, questions]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => prepQuestionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prepQuestions'] });
      queryClient.invalidateQueries({ queryKey: ['dailyPrep'] });
      closeFormModal();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => prepQuestionsApi.update(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prepQuestions'] });
      queryClient.invalidateQueries({ queryKey: ['dailyPrep'] });
      closeFormModal();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload = {
      question_text: formData.question_text,
      question_type: formData.question_type,
    };

    if (formData.question_type === 'multiple_choice') {
      payload.options = formData.options.filter(opt => opt.trim() !== '');
      payload.allow_multiple = formData.allow_multiple;
    }

    if (mode === 'edit') {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const addOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, ''],
    }));
  };

  const removeOption = (index) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index, value) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt),
    }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const footer = (
    <>
      <button
        type="button"
        onClick={closeFormModal}
        className="px-4 py-2 rounded-lg font-medium border transition hover:bg-gray-50"
        style={{ borderColor: 'rgba(199, 199, 204, 0.4)', color: '#1D1D1F' }}
        disabled={isPending}
      >
        Cancel
      </button>
      <button
        type="submit"
        form="question-form"
        className="px-6 py-2 rounded-lg font-medium text-white transition hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #2C2C2E, #1D1D1F)' }}
        disabled={isPending}
      >
        {isPending ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Question'}
      </button>
    </>
  );

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={closeFormModal}
      title={mode === 'edit' ? 'Edit Question' : 'New Question'}
      footer={footer}
    >
      <form id="question-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#1D1D1F' }}>
            Question
          </label>
          <input
            type="text"
            value={formData.question_text}
            onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
            placeholder="What would you like to ask yourself daily?"
            className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none transition"
            style={{
              border: '1px solid rgba(199, 199, 204, 0.4)',
              fontFamily: "'Inter', sans-serif",
              background: '#F9F9FB',
            }}
            required
          />
        </div>

        {/* Question Type */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: '#1D1D1F' }}>
            Answer Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, question_type: type.value }))}
                className="p-4 rounded-lg text-left transition"
                style={{
                  border: formData.question_type === type.value
                    ? '2px solid #1D1D1F'
                    : '1px solid rgba(199, 199, 204, 0.4)',
                  background: formData.question_type === type.value ? '#F5F5F7' : '#FFFFFF',
                }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <i className={`fa-solid ${type.icon}`} style={{ color: '#8E8E93' }}></i>
                  <span className="font-medium" style={{ color: '#1D1D1F' }}>{type.label}</span>
                </div>
                <p className="text-xs" style={{ color: '#8E8E93' }}>{type.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Multiple Choice Options */}
        {formData.question_type === 'multiple_choice' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: '#1D1D1F' }}>
                Options
              </label>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 rounded-lg text-sm focus:outline-none transition"
                      style={{
                        border: '1px solid rgba(199, 199, 204, 0.4)',
                        background: '#F9F9FB',
                      }}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="w-9 h-9 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                      >
                        <i className="fa-solid fa-times text-sm" style={{ color: '#DC2626' }}></i>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-3 text-sm font-medium flex items-center gap-2 transition hover:opacity-70"
                style={{ color: '#1D1D1F' }}
              >
                <i className="fa-solid fa-plus"></i>
                Add Option
              </button>
            </div>

            {/* Allow Multiple */}
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: '#F9F9FB' }}>
              <div>
                <p className="font-medium text-sm" style={{ color: '#1D1D1F' }}>Allow multiple selections</p>
                <p className="text-xs" style={{ color: '#8E8E93' }}>Users can select more than one option</p>
              </div>
              <div
                onClick={() => setFormData(prev => ({ ...prev, allow_multiple: !prev.allow_multiple }))}
                className="relative w-12 h-7 rounded-full transition-colors duration-200 cursor-pointer"
                style={{ backgroundColor: formData.allow_multiple ? '#34C759' : '#E5E5E7' }}
              >
                <div
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: formData.allow_multiple ? 'translateX(22px)' : 'translateX(4px)' }}
                />
              </div>
            </div>
          </>
        )}
      </form>
    </SlideOverPanel>
  );
};

export default QuestionFormModal;

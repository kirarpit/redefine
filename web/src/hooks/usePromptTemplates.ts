import { useCallback, useEffect, useRef, useState } from "react";
import {
  PromptType,
  fetchPromptTemplate,
  savePromptTemplate,
} from "../services/prompts";

type PromptState = {
  promptTemplate: string;
  originalPromptTemplate: string;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  hasUnsavedChanges: boolean;
};

type PromptStateMap = Record<PromptType, PromptState>;

const createInitialPromptState = (): PromptState => ({
  promptTemplate: "",
  originalPromptTemplate: "",
  isSaving: false,
  saveError: null,
  saveSuccess: false,
  hasUnsavedChanges: false,
});

const createInitialStateMap = (): PromptStateMap => ({
  general: createInitialPromptState(),
  anki: createInitialPromptState(),
});

export const usePromptTemplates = () => {
  const [promptStates, setPromptStates] =
    useState<PromptStateMap>(createInitialStateMap);
  const successTimersRef = useRef<Partial<Record<PromptType, number>>>({});

  useEffect(() => {
    return () => {
      Object.values(successTimersRef.current).forEach((timerId) => {
        if (timerId) {
          window.clearTimeout(timerId);
        }
      });
    };
  }, []);

  const scheduleSuccessReset = useCallback((type: PromptType) => {
    if (successTimersRef.current[type]) {
      window.clearTimeout(successTimersRef.current[type]);
    }
    successTimersRef.current[type] = window.setTimeout(() => {
      setPromptStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          saveSuccess: false,
        },
      }));
      successTimersRef.current[type] = undefined;
    }, 3000);
  }, []);

  const updateTemplate = useCallback((type: PromptType, template: string) => {
    setPromptStates((prev) => {
      const current = prev[type];
      return {
        ...prev,
        [type]: {
          ...current,
          promptTemplate: template,
          hasUnsavedChanges: template !== current.originalPromptTemplate,
          saveError: null,
        },
      };
    });
  }, []);

  const performSave = useCallback(
    async (type: PromptType, template: string) => {
      setPromptStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          isSaving: true,
          saveError: null,
          saveSuccess: false,
        },
      }));

      try {
        await savePromptTemplate(template, type);

        setPromptStates((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            promptTemplate: template,
            originalPromptTemplate: template,
            isSaving: false,
            saveSuccess: true,
            hasUnsavedChanges: false,
          },
        }));
        scheduleSuccessReset(type);
      } catch (error) {
        setPromptStates((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isSaving: false,
            saveError:
              error instanceof Error
                ? error.message
                : `Failed to save ${type} prompt template`,
          },
        }));
      }
    },
    [scheduleSuccessReset]
  );

  const saveTemplate = useCallback(
    async (type: PromptType, template: string) => {
      await performSave(type, template);
    },
    [performSave]
  );

  const resetToDefault = useCallback(
    async (type: PromptType) => {
      setPromptStates((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          isSaving: true,
          saveError: null,
          saveSuccess: false,
        },
      }));

      try {
        const defaultTemplate = await fetchPromptTemplate(type, true);

        if (!defaultTemplate && defaultTemplate !== "") {
          throw new Error(`Default ${type} prompt template not available.`);
        }

        setPromptStates((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            promptTemplate: defaultTemplate ?? "",
            originalPromptTemplate: defaultTemplate ?? "",
            hasUnsavedChanges: false,
          },
        }));

        await performSave(type, defaultTemplate ?? "");
      } catch (error) {
        setPromptStates((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            isSaving: false,
            saveError:
              error instanceof Error
                ? error.message
                : `Failed to reset ${type} prompt template`,
          },
        }));
      }
    },
    [performSave]
  );

  const loadTemplates = useCallback(async () => {
    const [generalTemplate, ankiTemplate] = await Promise.all([
      fetchPromptTemplate("general"),
      fetchPromptTemplate("anki"),
    ]);

    setPromptStates((prev) => ({
      general: {
        ...prev.general,
        promptTemplate: generalTemplate ?? prev.general.promptTemplate,
        originalPromptTemplate:
          generalTemplate ?? prev.general.originalPromptTemplate,
        hasUnsavedChanges: false,
      },
      anki: {
        ...prev.anki,
        promptTemplate: ankiTemplate ?? prev.anki.promptTemplate,
        originalPromptTemplate:
          ankiTemplate ?? prev.anki.originalPromptTemplate,
        hasUnsavedChanges: false,
      },
    }));

    return {
      generalLoaded: generalTemplate !== null,
      ankiLoaded: ankiTemplate !== null,
    };
  }, []);

  const hasUnsavedChanges =
    promptStates.general.hasUnsavedChanges ||
    promptStates.anki.hasUnsavedChanges;

  return {
    promptStates,
    updateTemplate,
    saveTemplate,
    resetToDefault,
    loadTemplates,
    hasUnsavedChanges,
  };
};

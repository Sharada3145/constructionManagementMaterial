import React, { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { MicrophoneIcon as MicrophoneOutlineIcon } from '@heroicons/react/24/outline';
import { parseCommand, matchEntity } from '../../utils/voiceParser';

const VoiceAssistant = ({ materials, contractors, onResult, onValidationFail }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        processCommand(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
            onValidationFail(`Microphone error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }
  }, [materials, contractors]);

  const processCommand = (text) => {
    const { action, quantity, materialText, contractorText, matchedContractor } = parseCommand(text, contractors);

    if (action !== 'issue') {
      onValidationFail(`Could not understand action. Say something like "Issue 50 cement to Ramesh".`);
      return;
    }

    if (!quantity) {
      onValidationFail(`Could not detect a quantity in your voice command.`);
      return;
    }

    // Match material
    const matchedMaterial = matchEntity(materialText, materials, ['name', 'category', 'description']);
    if (!matchedMaterial) {
      onValidationFail(`Could not find a material matching "${materialText}" in your inventory.`);
      return;
    }

    // Validate stock
    if (quantity > matchedMaterial.quantity) {
      onValidationFail(`Insufficient stock for ${matchedMaterial.name}. Available: ${matchedMaterial.quantity}, Requested: ${quantity}`);
      return;
    }

    // Match contractor
    let finalContractor = matchedContractor;
    if (!finalContractor && contractorText) {
      finalContractor = matchEntity(contractorText, contractors, ['name', 'email']);
    }
    
    if (!finalContractor) {
      onValidationFail(`Could not find a contractor matching "${contractorText}" in your branch.`);
      return;
    }

    // Success
    onResult({
      contractor: finalContractor,
      material: matchedMaterial,
      quantity: quantity
    });
  };

  const toggleListen = () => {
    if (!recognitionRef.current) {
      onValidationFail('Your browser does not support voice recognition.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      return null;
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggleListen}
        className={`flex items-center justify-center p-2 rounded-full transition-all shadow-sm border ${
          isListening 
            ? 'bg-red-500 text-white border-red-600 animate-pulse' 
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-primary-600'
        }`}
        title="Voice Assistant"
      >
        {isListening ? (
          <MicrophoneIcon className="w-5 h-5" />
        ) : (
          <MicrophoneOutlineIcon className="w-5 h-5" />
        )}
      </button>
      {transcript && !isListening && (
        <span className="text-xs text-slate-500 italic max-w-xs truncate">
          "{transcript}"
        </span>
      )}
      {isListening && (
        <span className="text-xs text-red-500 font-medium animate-pulse">
          Listening...
        </span>
      )}
    </div>
  );
};

export default VoiceAssistant;

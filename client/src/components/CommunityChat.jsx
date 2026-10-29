import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Mic, Send, Square, X } from 'lucide-react';
import { chatApi, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';

function mergeMessages(current, incoming) {
  const messages = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => messages.set(message.id, message));
  return [...messages.values()].sort(
    (first, second) => new Date(first.createdAt) - new Date(second.createdAt)
  ).slice(-100);
}

function formatMessageTime(value) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function CommunityChat({ groupId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [mediaConfigured, setMediaConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const stayAtBottomRef = useRef(true);

  useEffect(() => {
    let active = true;
    let stream;
    let hasConnected = false;
    let checkingConnection = false;
    const reloadMessages = () => chatApi.list(groupId)
      .then((response) => {
        if (!active) return;
        const data = response.data.data;
        setMessages((current) => mergeMessages(current, data.messages));
        setMediaConfigured(data.mediaConfigured);
        setError('');
      });

    const connect = () => {
      const currentStream = new EventSource(chatApi.streamUrl(groupId), { withCredentials: true });
      stream = currentStream;
      currentStream.onopen = () => {
        if (!active) return;
        const reconnecting = hasConnected;
        hasConnected = true;
        setConnected(true);
        if (reconnecting) {
          reloadMessages().catch((requestError) => {
            if (active) setError(getErrorMessage(requestError));
          });
        }
      };
      currentStream.onerror = () => {
        if (!active) return;
        setConnected(false);
        if (currentStream.readyState === EventSource.CLOSED && !checkingConnection) {
          checkingConnection = true;
          reloadMessages()
            .then(() => {
              if (!active) return;
              currentStream.close();
              connect();
            })
            .catch((requestError) => {
              if (active) setError(getErrorMessage(requestError));
            })
            .finally(() => {
              checkingConnection = false;
            });
        }
      };
      currentStream.addEventListener('chat-message', (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data);
          setMessages((current) => mergeMessages(current, [message]));
        } catch {
          setError('A live chat update could not be displayed.');
        }
      });
    };

    connect();
    reloadMessages()
      .catch((requestError) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      stream?.close();
    };
  }, [groupId]);

  useEffect(() => {
    if (stayAtBottomRef.current) {
      const element = messagesRef.current;
      element?.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  const handleScroll = useCallback(() => {
    const element = messagesRef.current;
    if (!element) return;
    stayAtBottomRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
  }, []);

  const sendMessage = async (event) => {
    event.preventDefault();
    const trimmedText = text.trim();
    if (sending || (!trimmedText && !selectedFile)) return;

    setSending(true);
    setError('');
    try {
      let payload = { text: trimmedText };
      if (selectedFile) {
        const formData = new FormData();
        formData.append('text', trimmedText);
        formData.append('file', selectedFile);
        payload = formData;
      }
      const response = await chatApi.send(groupId, payload);
      setMessages((current) => mergeMessages(current, [response.data.data.message]));
      setText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      stayAtBottomRef.current = true;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not supported by this browser.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const formats = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = formats.find((format) => MediaRecorder.isTypeSupported(format));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const extension = type.includes('ogg') ? 'ogg' : 'webm';
        const audio = new File(chunksRef.current, `voice-note.${extension}`, { type });
        setSelectedFile(audio);
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        recorderRef.current = null;
      };
      recorder.start();
      setRecording(true);
    } catch (recordError) {
      setError(getErrorMessage(recordError));
      stream?.getTracks().forEach((track) => track.stop());
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  return (
    <section className="panel community-chat" aria-label="Community chat">
      <div className="panel-heading community-chat-heading">
        <div>
          <h3>Community chat</h3>
          <p>Share a quick update, photo, or voice note with your group.</p>
        </div>
        <span className={`chat-connection ${connected ? 'connected' : ''}`}>
          <i /> {connected ? 'Live' : 'Connecting'}
        </span>
      </div>

      <div
        className="chat-messages"
        ref={messagesRef}
        onScroll={handleScroll}
        aria-live="polite"
        aria-busy={loading}
      >
        {loading ? <p className="chat-empty">Loading messages…</p> : null}
        {!loading && messages.length === 0 ? (
          <p className="chat-empty">No messages yet. Start the conversation!</p>
        ) : null}
        {messages.map((message) => {
          const ownMessage = message.sender.id === user?.id;
          return (
            <article
              className={`chat-message ${ownMessage ? 'own-message' : ''}`}
              key={message.id}
            >
              <span
                className="chat-avatar"
                style={message.sender.avatarColor ? { background: message.sender.avatarColor } : undefined}
                aria-hidden="true"
              >
                {message.sender.name?.charAt(0)?.toUpperCase() || '?'}
              </span>
              <div className="chat-message-content">
                <div className="chat-message-meta">
                  <strong>{ownMessage ? 'You' : message.sender.name}</strong>
                  <time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time>
                </div>
                {message.text ? <p>{message.text}</p> : null}
                {message.attachment?.kind === 'image' ? (
                  <a
                    className="chat-image-link"
                    href={chatApi.mediaUrl(groupId, message.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <img
                      src={chatApi.mediaUrl(groupId, message.id)}
                      alt="Shared by a community member"
                      loading="lazy"
                      crossOrigin="use-credentials"
                    />
                  </a>
                ) : null}
                {message.attachment?.kind === 'audio' ? (
                  <audio
                    controls
                    preload="metadata"
                    src={chatApi.mediaUrl(groupId, message.id)}
                    crossOrigin="use-credentials"
                  >
                    Your browser does not support audio playback.
                  </audio>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {error ? <p className="chat-error" role="alert">{error}</p> : null}
      {selectedFile ? (
        <div className="chat-attachment-pending">
          <span>{selectedFile.name}</span>
          <button
            type="button"
            className="chat-icon-button"
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            aria-label="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}
      <form className="chat-composer" onSubmit={sendMessage}>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Write a message…"
          maxLength={2000}
          rows={2}
          aria-label="Write a chat message"
        />
        <div className="chat-composer-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            aria-label="Choose an image"
          />
          <button
            type="button"
            className="chat-icon-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!mediaConfigured || sending || recording}
            aria-label="Attach an image"
            title={mediaConfigured ? 'Attach an image' : 'Configure Cloudinary to enable uploads'}
          >
            <ImagePlus size={18} />
          </button>
          {recording ? (
            <button
              type="button"
              className="chat-icon-button recording"
              onClick={stopRecording}
              aria-label="Stop voice recording"
              title="Stop recording"
            >
              <Square size={17} />
            </button>
          ) : (
            <button
              type="button"
              className="chat-icon-button"
              onClick={startRecording}
              disabled={!mediaConfigured || sending || selectedFile}
              aria-label="Record a voice note"
              title={mediaConfigured ? 'Record a voice note' : 'Configure Cloudinary to enable uploads'}
            >
              <Mic size={18} />
            </button>
          )}
          <button
            type="submit"
            className="chat-send-button"
            disabled={sending || recording || (!text.trim() && !selectedFile)}
          >
            <Send size={16} /> {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
      {!mediaConfigured ? (
        <p className="chat-media-notice">
          Text chat is available. Configure Cloudinary in the server environment to enable image and voice uploads.
        </p>
      ) : (
        <p className="chat-media-notice">Images and voice notes up to 10 MB are supported.</p>
      )}
    </section>
  );
}

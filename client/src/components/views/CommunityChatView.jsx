import { MessageCircle } from 'lucide-react';
import CommunityChat from '../CommunityChat';

export default function CommunityChatView({ groupId }) {
  return (
    <div className="view active">
      <div className="page-intro community-page-intro">
        <div className="community-page-icon" aria-hidden="true">
          <MessageCircle size={23} />
        </div>
        <div>
          <h2>Your community, one conversation.</h2>
          <p>Catch up on the group chat, share an update, and cheer each other on.</p>
        </div>
      </div>
      <CommunityChat groupId={groupId} />
    </div>
  );
}

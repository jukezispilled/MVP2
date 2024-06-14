import React, { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useGame } from '@/common/hooks/useGame';
import { socket } from '@/common/libs/socket';

// Modal Component
interface ModalProps {
  message: string;
  onClose: () => void;
}

const Modal: React.FC<ModalProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-8 rounded shadow-lg text-center">
        <p className='text-black'>{message}</p>
        <button className="mt-4 btn bg-red-600" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

interface GameInputsProps {
  name: string;
}

const GameInputs: React.FC<GameInputsProps> = ({ name }) => {
  const { setAdmin } = useGame();
  const [gameId, setGameId] = useState<string>('');
  const [isSmallScreen, setIsSmallScreen] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    socket.on('game_joined', (serverGameId: string, id: string) => {
      setAdmin({
        id,
        name,
      });

      router.push(serverGameId);
    });

    return () => {
      socket.off('game_joined');
    };
  }, [name, router, setAdmin]);

  const handleJoinGame = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSmallScreen) {
      setShowModal(true);
    } else {
      socket.emit('join_game', name, gameId);
    }
  };

  const handleCreateGame = () => {
    if (isSmallScreen) {
      setShowModal(true);
    } else {
      socket.emit('create_game', name);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const SmallScreenGameInputs: React.FC = () => {
    return (
      <>
        <form>
          <label>
            <p>Enter game id</p>
            <input
              type="text"
              className="input bg-white text-black"
              placeholder="Game id..."
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
          </label>
          <button className="btn mt-3 bg-green-600" onClick={handleOpenModal}>
            Join game
          </button>
        </form>

        <div className="flex w-full items-center gap-3">
          <div className="my-10 h-px flex-1 bg-zinc-500/40" />
          <p className="text-white">or</p>
          <div className="my-10 h-px flex-1 bg-zinc-500/40" />
        </div>

        <button className="btn bg-green-600" onClick={handleOpenModal}>
          Create game
        </button>
      </>
    );
  };

  const handleOpenModal = () => {
    setShowModal(true);
  };

  if (showModal && isSmallScreen) {
    return (
      <>
        <SmallScreenGameInputs />
        <Modal message="Game only available on desktop" onClose={handleModalClose} />
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleJoinGame}>
        <label>
          <p>Enter game id</p>
          <input
            type="text"
            className="input bg-white text-black"
            placeholder="Game id..."
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
        </label>
        <button className="btn mt-3 bg-green-600" type="submit">
          Join game
        </button>
      </form>

      <div className="flex w-full items-center gap-3">
        <div className="my-10 h-px flex-1 bg-zinc-500/40" />
        <p className="text-white">or</p>
        <div className="my-10 h-px flex-1 bg-zinc-500/40" />
      </div>

      <button className="btn bg-green-600" onClick={handleCreateGame}>
        Create game
      </button>
    </>
  );
};

export default GameInputs;
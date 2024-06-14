import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { DEFAULT_GAME } from '@/common/context/gameContext';
import { useGame } from '@/common/hooks/useGame';
import { usePeers } from '@/common/hooks/usePeers';
import { socket } from '@/common/libs/socket';
import Help from '@/modules/help';
import { useModal } from '@/modules/modal';

import GameInputs from './GameInputs';

const Home = () => {
  const { setGame } = useGame();
  const { setPeers, peers } = usePeers();
  const { closeModal, openModal } = useModal();

  const [name, setName] = useState('');

  useEffect(() => {
    toast.dismiss();

    setName(localStorage.getItem('name') || '');

    closeModal();
    setGame({ ...DEFAULT_GAME, players: new Map() });
    peers.forEach((peer) => peer.destroy());
    setPeers(new Map());
    socket.emit('leave_game');

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-screen w-screen bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
      <div className="flex justify-center py-24">
        <div className="flex w-max flex-col items-center">
          <h1
            className="text-[80px] md:text-[120px] font-black text-center"
            style={{
              backgroundImage: "url('/bg1.jpg')",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            MVP
          </h1>

          <div className="mb-5 rounded-lg text-3xl font-bold text-yellow-300 transition-transform active:scale-100">
            Most Valuable Pepe
          </div>

          <label>
            <p>Enter your name</p>
            <input
              type="text"
              className="h-8 w-72 rounded-lg bg-white px-4 ring-green-500 focus:outline-none focus:ring text-black"
              placeholder="Player"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                localStorage.setItem('name', e.target.value);
              }}
            />
          </label>

          <div className="my-10 h-px w-full bg-white" />

          <GameInputs name={name} />
        </div>
      </div>
    </div>
  );
};

export default Home;
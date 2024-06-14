import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

import {
  BALL_SIZE,
  BOARD_SIZE,
  PLAYER_SIZE,
  REAL_BOARD_SIZE,
  SHOOT_DISTANCE,
} from '@/common/constants/settings';
import { useGame } from '@/common/hooks/useGame';
import { usePeers } from '@/common/hooks/usePeers';
import { decoder } from '@/common/libs/decoder';
import { socket } from '@/common/libs/socket'; // Assuming this is where socket is imported from
import {
  Data,
  DataType,
  GameData,
  PlayerJoinLeftData,
  PositionData,
} from '@/common/types/peer.type';
import { PlayerTeam } from '@/common/types/player.type';

import { useAdminGame } from '../../../hooks/useAdminGame';
import { usePeersConnect } from '../../../hooks/usePeersConnect';
import { useCamera } from '../hooks/useCamera';
import { useKeysDirection } from '../hooks/useKeysDirection';
import { useShoot } from '../hooks/useShoot';
import BallTracker from './BallTracker';
import SpectateControls from './SpectateControls';

const Movables = () => {
  const { setPosition, camX, camY, position } = useCamera();
  const { game, setGame } = useGame();
  const { admin } = game;
  const { adminPeer } = usePeers();

  const ref = useRef<HTMLCanvasElement>(null);

  const [playersPositions, setPlayersPositions] = useState<{
    [key: string]: [number, number, number];
  }>({});
  const [ballPosition, setBallPosition] = useState<[number, number]>([100, 100]);
  const [spectating, setSpectating] = useState<string>(''); // Initialize spectating with an empty string

  const direction = useKeysDirection();
  const shoot = useShoot();

  const names = usePeersConnect();
  const [adminPlayersPositions, adminPlayers, adminBallPosition] = useAdminGame(
    names,
    { direction, shoot }
  );

  useEffect(() => {
    const handleData = (data: Uint8Array) => {
      try {
        const parsedData = JSON.parse(decoder.decode(data)) as Data;

        if (parsedData.type === DataType.POSITIONS) {
          const dataTyped = parsedData as PositionData;
          setPlayersPositions(dataTyped.positions);
          setBallPosition(dataTyped.ballPosition);
        } else if (parsedData.type === DataType.GAME) {
          const gameFromAdmin = (parsedData as GameData).game;
          const playersFromAdmin = new Map(gameFromAdmin.players);

          const oldMe = socket.id ? game.players.get(socket.id) : undefined;
          const newMe = socket.id ? playersFromAdmin.get(socket.id) : undefined;

          if (oldMe && oldMe?.team !== newMe?.team) {
            if (newMe?.team === PlayerTeam.SPECTATOR) {
              toast('You are now a spectator', {
                type: 'info',
              });
            } else if (oldMe) {
              toast(
                `You are now in ${newMe?.team === PlayerTeam.RED ? 'red' : 'blue'} team`,
                {
                  type: 'info',
                }
              );
            }
          }

          setGame({
            ...gameFromAdmin,
            players: playersFromAdmin,
          });
        } else if (parsedData.type === DataType.PLAYER_JOIN_LEFT) {
          const typedData = parsedData as PlayerJoinLeftData;

          toast(
            `${typedData.name} ${typedData.join ? 'joined' : 'left'} the game`,
            {
              type: 'info',
            }
          );
        }
      } catch (error) {
        console.error('Error parsing data:', error);
      }
    };

    if (admin.id && admin.id !== socket.id && adminPeer) {
      adminPeer.on('data', handleData);

      return () => {
        adminPeer.removeListener('data', handleData);
      };
    }
  }, [admin.id, adminPeer, game, setGame]);

  const finalPlayers = admin.id === (socket.id as string) ? adminPlayers : game.players;
  const finalPlayersPositions =
    admin.id === (socket.id as string) ? adminPlayersPositions : playersPositions;
  const finalBallPosition =
    admin.id === (socket.id as string) ? adminBallPosition : ballPosition;

  useEffect(() => {
    const cameraPosition = {
      x: BOARD_SIZE.width / 2 + PLAYER_SIZE * 2,
      y: BOARD_SIZE.height / 2 + PLAYER_SIZE * 2,
    };

    if (finalPlayers.get(socket.id as string)?.team === PlayerTeam.SPECTATOR) { // Type assertion to string if necessary
      const spectatingPosition = finalPlayersPositions[spectating];

      if (spectatingPosition) {
        [cameraPosition.x, cameraPosition.y] = spectatingPosition;
      }
    } else {
      const myPosition = finalPlayersPositions[socket.id as string]; // Type assertion to string if necessary
      if (myPosition) {
        [cameraPosition.x, cameraPosition.y] = myPosition;
      }
    }

    if (position.x !== cameraPosition.x || position.y !== cameraPosition.y)
      setPosition(cameraPosition);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalPlayersPositions, finalPlayers, position, spectating]);

  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(
        0,
        0,
        REAL_BOARD_SIZE.width + PLAYER_SIZE * 2,
        REAL_BOARD_SIZE.height + PLAYER_SIZE
      );

      ctx.translate(camX, camY);

      ctx.lineWidth = 2;
      ctx.font = `bold ${PLAYER_SIZE / 1.9}px Montserrat`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';

      ctx.beginPath();
      ctx.arc(
        finalBallPosition[0],
        finalBallPosition[1],
        BALL_SIZE,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.closePath();

      finalPlayers.forEach(({ team }, id) => {
        if (!finalPlayersPositions[id] || team === PlayerTeam.SPECTATOR) return;
        const [x, y, isShooting] = finalPlayersPositions[id];

        ctx.fillStyle = team === PlayerTeam.BLUE ? '#3b82f6' : '#ef4444';
        ctx.strokeStyle = '#000';

        ctx.beginPath();
        ctx.arc(x, y, PLAYER_SIZE, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();

        if (isShooting) {
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x, y, PLAYER_SIZE + SHOOT_DISTANCE, 0, Math.PI * 2);
          ctx.stroke();
          ctx.closePath();
        }
      });

      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      finalPlayers.forEach(({ name, team, index }, id) => {
        if (!finalPlayersPositions[id] || team === PlayerTeam.SPECTATOR) return;
        const [x, y] = finalPlayersPositions[id];

        ctx.font = 'bold 32px Montserrat';
        ctx.textBaseline = 'middle';
        ctx.fillText(index.toString(), x, y + 2);

        ctx.font = 'bold 16px Montserrat';
        ctx.fillText(name, x, y + PLAYER_SIZE + 20);
      });
    }
  }, [finalBallPosition, finalPlayers, finalPlayersPositions, camX, camY]);

  return (
    <>
      {finalPlayers.get(socket.id as string)?.team === PlayerTeam.SPECTATOR && (
        <SpectateControls
          setSpectating={(id) => setSpectating(id)}
          spectating={spectating || ''} // Ensure spectating is not undefined
        />
      )}
      <BallTracker ballPosition={finalBallPosition} />
      <canvas
        ref={ref}
        width={REAL_BOARD_SIZE.width}
        height={REAL_BOARD_SIZE.height}
        className="absolute z-10"
      />
    </>
  );
};

export default Movables;
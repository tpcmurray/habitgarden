'use client';

interface SkyAtmosphereProps {
  averageCompletionRate: number;
  habitCount: number;
}

type Atmosphere = 'sunny' | 'partly_cloudy' | 'cloudy' | 'overcast' | 'rainy';

interface AtmosphereConfig {
  sky: string;
  ground: string;
  ambient: string[];
  label: string;
}

const atmosphereConfigs: Record<Atmosphere, AtmosphereConfig> = {
  sunny: {
    sky: 'bg-gradient-to-b from-blue-300 to-blue-200',
    ground: 'bg-green-400',
    ambient: ['🦋', '🐝', '🐦'],
    label: '☀️ Beautiful day!',
  },
  partly_cloudy: {
    sky: 'bg-gradient-to-b from-blue-200 to-gray-100',
    ground: 'bg-green-300',
    ambient: ['🐦'],
    label: '🌤️ Nice weather',
  },
  cloudy: {
    sky: 'bg-gradient-to-b from-gray-200 to-gray-300',
    ground: 'bg-green-200',
    ambient: [],
    label: '⛅ Overcast',
  },
  overcast: {
    sky: 'bg-gradient-to-b from-gray-300 to-gray-400',
    ground: 'bg-yellow-200',
    ambient: [],
    label: '🌥️ Grey skies',
  },
  rainy: {
    sky: 'bg-gradient-to-b from-gray-400 to-gray-500',
    ground: 'bg-yellow-100',
    ambient: [],
    label: '🌧️ Rainy day',
  },
};

/**
 * Determine atmosphere based on average completion rate
 */
function getAtmosphere(averageRate: number, habitCount: number): Atmosphere {
  if (habitCount === 0) return 'cloudy';
  if (averageRate >= 85) return 'sunny';
  if (averageRate >= 70) return 'partly_cloudy';
  if (averageRate >= 50) return 'cloudy';
  if (averageRate >= 25) return 'overcast';
  return 'rainy';
}

export function SkyAtmosphere({ averageCompletionRate, habitCount }: SkyAtmosphereProps) {
  const atmosphere = getAtmosphere(averageCompletionRate, habitCount);
  const config = atmosphereConfigs[atmosphere];

  return (
    <div className="relative overflow-hidden rounded-t-2xl">
      {/* Sky */}
      <div className={`h-24 ${config.sky} transition-all duration-500 relative`}>
        {/* Sun/Clouds */}
        <div className="absolute top-2 right-4 text-3xl">
          {atmosphere === 'sunny' && '☀️'}
          {atmosphere === 'partly_cloudy' && '🌤️'}
          {atmosphere === 'cloudy' && '⛅'}
          {atmosphere === 'overcast' && '🌥️'}
          {atmosphere === 'rainy' && '🌧️'}
        </div>

        {/* Ambient elements */}
        <div className="absolute inset-0 flex items-center justify-around px-8">
          {config.ambient.map((emoji, idx) => (
            <span
              key={idx}
              className="text-xl animate-bounce"
              style={{ animationDelay: `${idx * 0.3}s` }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* Rainbow for sunny */}
        {atmosphere === 'sunny' && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-transparent via-rainbow-200 to-transparent opacity-30" />
        )}
      </div>

      {/* Ground */}
      <div
        className={`h-16 ${config.ground} transition-all duration-500 relative`}
      >
        {/* Ground decorations */}
        <div className="absolute bottom-2 left-4 text-lg">💚</div>
        <div className="absolute bottom-2 right-4 text-lg">🌿</div>
      </div>

      {/* Label */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white/80 px-3 py-1 rounded-full text-xs font-medium">
        {config.label}
      </div>
    </div>
  );
}

/**
 * Get atmosphere from average rate
 */
export function getAtmosphereFromRate(rate: number, habitCount: number): Atmosphere {
  return getAtmosphere(rate, habitCount);
}

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RotateCw, AlertCircle, CheckCircle } from 'lucide-react';

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface ConnectionStatusProps {
  connectionState: ConnectionState;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  queuedMessagesCount?: number;
  pendingMessagesCount?: number;
  onReconnect?: () => void;
  className?: string;
  showDetails?: boolean;
}

const connectionStateConfig = {
  connecting: {
    icon: RotateCw,
    label: 'Connecting',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  connected: {
    icon: CheckCircle,
    label: 'Connected',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  reconnecting: {
    icon: RotateCw,
    label: 'Reconnecting',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
};

export function ConnectionStatus({
  connectionState,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  queuedMessagesCount = 0,
  pendingMessagesCount = 0,
  onReconnect,
  className,
  showDetails = false,
}: ConnectionStatusProps) {
  const config = connectionStateConfig[connectionState];
  const Icon = config.icon;

  const getTooltipContent = () => {
    const details = [];
    
    if (connectionState === 'reconnecting') {
      details.push(`Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
    }
    
    if (queuedMessagesCount > 0) {
      details.push(`${queuedMessagesCount} queued messages`);
    }
    
    if (pendingMessagesCount > 0) {
      details.push(`${pendingMessagesCount} pending messages`);
    }

    return details.length > 0 ? details.join(' • ') : config.label;
  };

  const isAnimating = connectionState === 'connecting' || connectionState === 'reconnecting';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            {/* Connection Status Badge */}
            <Badge
              variant="outline"
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 transition-all duration-200',
                config.bgColor,
                config.borderColor,
                config.textColor
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'h-3 w-3',
                    isAnimating && 'animate-spin'
                  )}
                />
                {/* Connection indicator dot */}
                <div
                  className={cn(
                    'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full',
                    config.color,
                    connectionState === 'connected' && 'animate-pulse'
                  )}
                />
              </div>
              <span className="text-xs font-medium">
                {config.label}
              </span>
            </Badge>

            {/* Reconnect button for disconnected state */}
            {connectionState === 'disconnected' && onReconnect && (
              <Button
                size="sm"
                variant="outline"
                onClick={onReconnect}
                className="h-6 px-2 text-xs"
              >
                Retry
              </Button>
            )}

            {/* Message queue indicators */}
            {showDetails && (queuedMessagesCount > 0 || pendingMessagesCount > 0) && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {queuedMessagesCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {queuedMessagesCount} queued
                  </Badge>
                )}
                {pendingMessagesCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                    {pendingMessagesCount} pending
                  </Badge>
                )}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact version for minimal space
export function ConnectionStatusCompact({
  connectionState,
  reconnectAttempts = 0,
  maxReconnectAttempts = 5,
  queuedMessagesCount = 0,
  pendingMessagesCount = 0,
  onReconnect,
  className,
}: Omit<ConnectionStatusProps, 'showDetails'>) {
  const config = connectionStateConfig[connectionState];
  const Icon = config.icon;
  const isAnimating = connectionState === 'connecting' || connectionState === 'reconnecting';

  const getTooltipContent = () => {
    const details = [config.label];
    
    if (connectionState === 'reconnecting') {
      details.push(`Attempt ${reconnectAttempts}/${maxReconnectAttempts}`);
    }
    
    if (queuedMessagesCount > 0) {
      details.push(`${queuedMessagesCount} queued messages`);
    }
    
    if (pendingMessagesCount > 0) {
      details.push(`${pendingMessagesCount} pending messages`);
    }

    return details.join(' • ');
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              'relative flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-all duration-200',
              config.bgColor,
              config.borderColor,
              'border',
              className
            )}
            onClick={connectionState === 'disconnected' ? onReconnect : undefined}
          >
            <Icon
              className={cn(
                'h-3 w-3',
                config.textColor,
                isAnimating && 'animate-spin'
              )}
            />
            {/* Connection indicator dot */}
            <div
              className={cn(
                'absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full border border-white',
                config.color,
                connectionState === 'connected' && 'animate-pulse'
              )}
            />
            {/* Message queue indicator */}
            {(queuedMessagesCount > 0 || pendingMessagesCount > 0) && (
              <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-blue-500 border border-white" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook to use connection status anywhere
export function useConnectionStatus() {
  return {
    ConnectionStatus,
    ConnectionStatusCompact,
  };
}
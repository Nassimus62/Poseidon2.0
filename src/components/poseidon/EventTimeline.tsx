import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  ChevronDown,
  ChevronRight,
  Info
} from 'lucide-react';
import { DetectedEvent } from '@/types/poseidon';

interface EventTimelineProps {
  events: DetectedEvent[];
}

const eventTypeColors = {
  'Rising Tide': 'bg-blue-100 text-blue-800',
  'Falling Tide': 'bg-blue-50 text-blue-600',
  'High Tide': 'bg-blue-200 text-blue-900',
  'Low Tide': 'bg-slate-100 text-slate-600',
  'Storm Surge': 'bg-red-100 text-red-800',
  'Seiche': 'bg-purple-100 text-purple-800',
  'Infragravity': 'bg-indigo-100 text-indigo-800',
  'Spike': 'bg-yellow-100 text-yellow-800',
  'Flatline': 'bg-gray-100 text-gray-800',
  'Gap': 'bg-orange-100 text-orange-800',
  'Extreme Level': 'bg-red-200 text-red-900',
  'Aliased Activity': 'bg-pink-100 text-pink-800',
};

const confidenceIcons = {
  'High': <CheckCircle className="w-4 h-4 text-success" />,
  'Medium': <AlertTriangle className="w-4 h-4 text-warning" />,
  'Low': <XCircle className="w-4 h-4 text-destructive" />,
};

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const filteredEvents = events.filter(event => {
    const typeMatch = filterType === 'all' || event.type === filterType;
    const confidenceMatch = filterConfidence === 'all' || event.confidence === filterConfidence;
    return typeMatch && confidenceMatch;
  });

  const sortedEvents = [...filteredEvents].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime()
  );

  const eventTypes = [...new Set(events.map(e => e.type))];
  const eventStats = {
    total: events.length,
    high: events.filter(e => e.confidence === 'High').length,
    medium: events.filter(e => e.confidence === 'Medium').length,
    low: events.filter(e => e.confidence === 'Low').length,
  };

  const formatDuration = (start: Date, end?: Date) => {
    if (!end) return 'Instantaneous';
    const duration = end.getTime() - start.getTime();
    const minutes = Math.round(duration / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (events.length === 0) {
    return (
      <Card className="ocean-shadow">
        <CardContent className="p-8 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            No events detected. Run analysis to identify sea level events.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="ocean-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Event Timeline
        </CardTitle>
        
        {/* Event Statistics */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary">
            Total: {eventStats.total}
          </Badge>
          <Badge className="bg-success text-success-foreground">
            High: {eventStats.high}
          </Badge>
          <Badge className="bg-warning text-warning-foreground">
            Medium: {eventStats.medium}
          </Badge>
          <Badge variant="destructive">
            Low: {eventStats.low}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-border rounded px-2 py-1 text-sm"
            >
              <option value="all">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Confidence:</label>
            <select
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value)}
              className="border border-border rounded px-2 py-1 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        <Separator className="mb-4" />

        {/* Event List */}
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {sortedEvents.map((event, index) => {
              const isExpanded = expandedEvents.has(event.id);
              
              return (
                <div key={event.id} className="border border-border rounded-lg p-4 space-y-3">
                  {/* Event Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEventExpansion(event.id)}
                        className="p-1 h-6 w-6"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Badge 
                        className={eventTypeColors[event.type] || 'bg-muted text-muted-foreground'}
                      >
                        {event.type}
                      </Badge>
                      
                      <div className="flex items-center gap-1">
                        {confidenceIcons[event.confidence]}
                        <span className="text-sm font-medium">{event.confidence}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {event.startTime.toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(event.startTime, event.endTime)}
                      </p>
                    </div>
                  </div>

                  {/* Event Summary */}
                  <div>
                    <p className="text-sm font-medium">{event.label}</p>
                    {event.amplitude && (
                      <p className="text-xs text-muted-foreground">
                        Amplitude: {event.amplitude.toFixed(2)} cm
                      </p>
                    )}
                    {event.period && (
                      <p className="text-xs text-muted-foreground">
                        Period: {event.period.toFixed(1)} minutes
                      </p>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 p-3 bg-muted/30 rounded border-l-4 border-primary">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium mb-2">Analysis Details:</p>
                          <p className="text-sm text-muted-foreground mb-3">
                            {event.explanation}
                          </p>
                          
                          {/* Event Properties */}
                          {Object.keys(event.properties).length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium">Properties:</p>
                              {Object.entries(event.properties).map(([key, value]) => (
                                <p key={key} className="text-xs text-muted-foreground">
                                  {key}: {String(value)}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* Timing Details */}
                          <div className="mt-3 pt-2 border-t border-border/50">
                            <p className="text-xs">
                              <strong>Start:</strong> {event.startTime.toLocaleString()}
                            </p>
                            {event.endTime && (
                              <p className="text-xs">
                                <strong>End:</strong> {event.endTime.toLocaleString()}
                              </p>
                            )}
                            {event.peak && (
                              <p className="text-xs">
                                <strong>Peak:</strong> {event.peak.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
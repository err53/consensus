"use client";

import {
  useSessionQuery,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import { api } from "../convex/_generated/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  MoreHorizontal,
  UserX,
  RefreshCw,
  Check,
  X,
  Copy,
  ClipboardCheck,
} from "lucide-react";
import { Id } from "../convex/_generated/dataModel";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

const roomCodeSchema = z.object({
  code: z
    .string()
    .min(6, {
      message: "Room code must be 6 characters.",
    })
    .max(6, {
      message: "Room code must be 6 characters.",
    })
    .refine((code) => /^[A-Z0-9]{6}$/.test(code), {
      message: "Room code must contain only uppercase letters and numbers.",
    }),
});

export const Room = () => {
  const result = useSessionQuery(api.user.getUserAndRoom);
  const user = result?.user;
  const room = result?.room;

  const createRoom = useSessionMutation(api.room.createRoom);
  const joinRoom = useSessionMutation(api.room.joinRoom);
  const leaveRoom = useSessionMutation(api.room.leaveRoom);
  const vote = useSessionMutation(api.user.vote);
  const deleteUserFromRoom = useSessionMutation(api.room.deleteUserFromRoom);
  const regenerateRoomCode = useSessionMutation(api.room.regenerateRoomCode);

  const [isCreating, setIsCreating] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [previousMajority, setPreviousMajority] = useState(false);
  const [showMajorityAlert, setShowMajorityAlert] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const roomForm = useForm<z.infer<typeof roomCodeSchema>>({
    resolver: zodResolver(roomCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleCreateRoom = async () => {
    setIsCreating(true);
    try {
      await createRoom();
      toast.success("Room created successfully");
    } catch (error) {
      toast.error("Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (values: z.infer<typeof roomCodeSchema>) => {
    try {
      await joinRoom({ code: values.code });
      toast.success(`Joined room ${values.code}`);
    } catch (error) {
      toast.error("Failed to join room. The room may not exist.");
    }
  };

  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      await leaveRoom();
      toast.success("Left room successfully");
    } catch (error) {
      toast.error("Failed to leave room");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleVote = async () => {
    setIsVoting(true);
    try {
      await vote({ votedYes: !user?.votedYes });
      toast.success(user?.votedYes ? "Vote removed" : "Vote recorded");
    } catch (error) {
      toast.error("Failed to update vote");
    } finally {
      setIsVoting(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!room || !user) return;

    // Check if current user is the host
    const isHost = user._id === room.users[0]?._id;
    if (!isHost) {
      toast.error("Only the host can regenerate the room code");
      return;
    }

    setIsRegeneratingCode(true);
    try {
      await regenerateRoomCode();
      toast.success(`Room code regenerated`);
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate room code");
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const handleDeleteUser = async (targetUserId: Id<"users">) => {
    if (!room || !user) return;

    // Check if current user is the host
    const isHost = user._id === room.users[0]?._id;
    if (!isHost) {
      toast.error("Only the host can remove users");
      return;
    }

    setIsDeletingUser(true);
    try {
      await deleteUserFromRoom({ targetUserId });
      toast.success("User removed from room");
    } catch (error: any) {
      toast.error(error.message || "Failed to remove user");
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleCopyCode = () => {
    if (room?.code) {
      navigator.clipboard
        .writeText(room.code)
        .then(() => {
          setIsCopied(true);
          toast.success("Room code copied to clipboard");
          setTimeout(() => setIsCopied(false), 2000);
        })
        .catch(() => {
          toast.error("Failed to copy code");
        });
    }
  };

  // Check if the current user is the host
  const isHost = user?._id === room?.users[0]?._id;

  // Calculate if majority vote has passed
  const totalUsers = room?.users?.length || 0;
  const votesRequired = Math.ceil(totalUsers / 2); // More than 50%
  const totalVotes = room?.votes || 0;
  const hasMajority = totalVotes >= votesRequired && totalUsers > 0;

  // Detect when majority is first achieved to trigger the flash
  useEffect(() => {
    if (hasMajority && !previousMajority) {
      // Flash notification when majority is first achieved
      setShowMajorityAlert(true);

      // Hide after 2 seconds
      const timer = setTimeout(() => {
        setShowMajorityAlert(false);
      }, 2000);

      return () => clearTimeout(timer);
    }

    setPreviousMajority(hasMajority);
  }, [hasMajority, previousMajority]);

  if (user === undefined) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p>Loading room information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (user === null) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Account Required</CardTitle>
          <CardDescription>
            You need to create an account before joining or creating rooms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4 sm:p-8 bg-muted rounded-md">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Please use the profile section above to create your account
                first.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (room === null) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Room</CardTitle>
          <CardDescription>
            Join an existing room or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Join Room</h3>
              <Form {...roomForm}>
                <form
                  onSubmit={roomForm.handleSubmit(handleJoinRoom)}
                  className="space-y-4"
                >
                  <FormField
                    control={roomForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <FormControl>
                            <Input
                              placeholder="6-DIGIT CODE"
                              {...field}
                              className="uppercase"
                              maxLength={6}
                            />
                          </FormControl>
                          <Button
                            type="submit"
                            disabled={roomForm.formState.isSubmitting}
                            className="w-full sm:w-auto"
                          >
                            {roomForm.formState.isSubmitting
                              ? "Joining..."
                              : "Join"}
                          </Button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Create Room</h3>
              <Button
                onClick={handleCreateRoom}
                disabled={isCreating}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isCreating ? "Creating..." : "Create New Room"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Full-screen flash alert when majority is achieved */}
      {showMajorityAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-500/20 backdrop-blur-sm animate-in fade-in duration-300">
          <Alert className="w-[calc(100%-2rem)] max-w-lg border-green-500 bg-green-100 dark:bg-green-900/50 text-green-950 dark:text-green-100 animate-in zoom-in duration-300 relative pr-10">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            <AlertTitle className="text-xl">Majority Vote Achieved!</AlertTitle>
            <AlertDescription>
              {totalVotes} out of {totalUsers} members have voted yes.
            </AlertDescription>
            <button
              className="absolute top-4 right-4 text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 rounded-full p-1 transition-colors"
              onClick={() => setShowMajorityAlert(false)}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
            <span>Room Information</span>
            {isHost && (
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1 w-full sm:w-auto"
                onClick={handleRegenerateCode}
                disabled={isRegeneratingCode}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRegeneratingCode ? "animate-spin" : ""}`}
                />
                {isRegeneratingCode ? "Generating..." : "New Code"}
              </Button>
            )}
          </CardTitle>
          <CardDescription>Invite others with your room code</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-3 sm:p-4 bg-muted rounded-md relative">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold tracking-wider">
                {room?.code}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                Share this code with others to join
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-8 w-8"
              onClick={handleCopyCode}
              title="Copy code"
            >
              {isCopied ? (
                <ClipboardCheck className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Users in this room ({room?.users?.length || 0})
            </h3>
            <div className="border rounded-md">
              {room?.users && room.users.length > 0 ? (
                <div className="divide-y">
                  {room.users.map((roomUser, index) => (
                    <div
                      key={index}
                      className="p-2 sm:p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/initials/svg?seed=${roomUser.name}`}
                            alt={roomUser.name}
                          />
                          <AvatarFallback className="text-xs">
                            {roomUser.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm sm:text-base">
                          {roomUser.name}
                        </span>
                        {roomUser._id === room.users[0]?._id && (
                          <span className="text-xs bg-muted px-1.5 sm:px-2 py-0.5 rounded">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="flex items-center">
                        {/* Only show delete option for host and not for the host themselves */}
                        {isHost && roomUser._id !== user._id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={isDeletingUser}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDeleteUser(roomUser._id)}
                                className="text-destructive focus:text-destructive cursor-pointer"
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Remove from room
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No other users in this room
                </div>
              )}
            </div>

            <div
              className={`mt-4 p-2 sm:p-3 rounded-md flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 ${hasMajority ? "bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-pulse" : "bg-muted"}`}
            >
              <div>
                <span className="text-sm font-medium">Anonymous Voting:</span>{" "}
                <span className={hasMajority ? "font-medium" : ""}>
                  {room?.votes || 0} of {room?.users?.length || 0} voted yes
                  {hasMajority && " — Majority Achieved! ✓"}
                </span>
              </div>
              <Button
                onClick={handleVote}
                size="sm"
                variant={
                  user?.votedYes
                    ? hasMajority
                      ? "default"
                      : "outline"
                    : "outline"
                }
                className={
                  user?.votedYes && hasMajority
                    ? "bg-green-600 hover:bg-green-700 text-white border-green-600 w-full sm:w-auto"
                    : "w-full sm:w-auto"
                }
                disabled={isVoting}
              >
                {isVoting ? "Updating..." : user?.votedYes ? "Voted" : "Vote"}
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleLeaveRoom}
            variant="destructive"
            disabled={isLeaving}
            className="w-full sm:w-auto ml-auto"
          >
            {isLeaving ? "Leaving..." : "Leave Room"}
          </Button>
        </CardFooter>
      </Card>
    </>
  );
};

"use client";

import { useState } from "react";
import {
  useSessionQuery,
  useSessionMutation,
} from "convex-helpers/react/sessions";
import { api } from "../convex/_generated/api";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const nameSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

export const User = () => {
  const result = useSessionQuery(api.user.getUserAndRoom);
  const user = result?.user;

  const createUser = useSessionMutation(api.user.createUser);
  const changeName = useSessionMutation(api.user.changeName);
  const deleteUser = useSessionMutation(api.user.deleteUser);

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const nameForm = useForm<z.infer<typeof nameSchema>>({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  const handleCreateUser = () => {
    createUser()
      .then(() => toast.success("User created successfully"))
      .catch(() => toast.error("Failed to create user"));
  };

  const handleUpdateName = (values: z.infer<typeof nameSchema>) => {
    changeName({ name: values.name })
      .then(() => {
        toast.success("Name updated successfully");
        setIsDialogOpen(false);
      })
      .catch(() => toast.error("Failed to update name"));
  };

  const handleDeleteUser = () => {
    deleteUser()
      .then(() => toast.success("User deleted successfully"))
      .catch(() => toast.error("Failed to delete user"));
  };

  // Update form default values when user changes
  if (user && user.name !== nameForm.getValues().name) {
    nameForm.reset({ name: user.name });
  }

  if (user === undefined) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
            <p>Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (user === null) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            No user found. Create an account to get started.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={handleCreateUser} className="w-full">
            Create User
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar>
          <AvatarImage
            src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
            alt={user.name}
          />
          <AvatarFallback>
            {user.name.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>{user.name}</CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="flex flex-col sm:flex-row w-full gap-3 sm:justify-between">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto">
              Change Name
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Change your name here. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <Form {...nameForm}>
              <form
                onSubmit={nameForm.handleSubmit(handleUpdateName)}
                className="space-y-4"
              >
                <FormField
                  control={nameForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" className="w-full sm:w-auto">
                    Save changes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        <Button
          onClick={handleDeleteUser}
          variant="destructive"
          className="w-full sm:w-auto"
        >
          Delete User
        </Button>
      </CardFooter>
    </Card>
  );
};

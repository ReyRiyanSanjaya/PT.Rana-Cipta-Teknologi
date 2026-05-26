const prisma = require('../config/database'); // [FIX] Singleton Prisma
const { emitChatMessage, getRoomStats } = require('../socket');

exports.getRooms = async (req, res) => {
  const userId = req.user.id;
  try {
    // Find rooms: Public ones OR ones where user is a member
    const rooms = await prisma.chatRoom.findMany({
      where: {
        OR: [
          { type: 'public' },
          { members: { some: { userId } } }
        ]
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        members: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    });
    
    // Format response to be friendly
    const formattedRooms = rooms.map(room => {
      // Logic to determine room name if it's private (e.g. name of the other person)
      let roomName = room.name;
      // let roomIcon = room.icon;
      
      if (room.type === 'private' && room.members.length === 2) {
        const otherMember = room.members.find(m => m.user.id !== userId);
        if (otherMember) {
          roomName = otherMember.user.name;
          // roomIcon = otherMember.user.avatarUrl; // If avatar exists
        }
      }

      // Get real-time stats
      const stats = getRoomStats(room.id);

      return {
        ...room,
        displayName: roomName,
        lastMessage: room.messages[0] || null,
        onlineCount: stats.count
      };
    });

    res.json(formattedRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getMessages = async (req, res) => {
  const { roomId } = req.params;
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { 
          select: { 
            id: true, 
            name: true,
            role: true,
            store: { select: { name: true } },
            tenant: { select: { name: true } }
          } 
        }
      }
    });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.sendMessage = async (req, res) => {
  const { roomId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    const room = await prisma.chatRoom.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: 'Chat room not found' });

    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        userId,
        content,
        userName: req.user.name
      },
      include: {
        user: { 
          select: { 
            id: true, 
            name: true,
            role: true,
            store: { select: { name: true } },
            tenant: { select: { name: true } }
          } 
        }
      }
    });
    
    emitChatMessage(roomId, message);
    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.createRoom = async (req, res) => {
    const { name, type, memberIds } = req.body; // memberIds array of userIds
    const creatorId = req.user.id;
    
    try {
        // If private, check if room already exists with these 2 members
        if (type === 'private' && memberIds.length === 1) {
            const otherUserId = memberIds[0];
            const existingRoom = await prisma.chatRoom.findFirst({
                where: {
                    type: 'private',
                    AND: [
                        { members: { some: { userId: creatorId } } },
                        { members: { some: { userId: otherUserId } } }
                    ]
                }
            });
            if (existingRoom) {
                return res.json(existingRoom);
            }
        }

        const room = await prisma.chatRoom.create({
            data: {
                name: name || 'New Chat',
                type: type || 'private',
                members: {
                    create: [
                        { userId: creatorId },
                        ...(memberIds || []).map(id => ({ userId: id }))
                    ]
                }
            }
        });
        res.status(201).json(room);
    } catch (error) {
        console.error('Error creating chat room:', error);
        res.status(500).json({ error: error.message });
    }
};

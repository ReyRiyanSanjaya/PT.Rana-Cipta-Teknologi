const prisma = require('../config/database');

exports.submitScore = async (req, res) => {
  const { gameId, score } = req.body;
  const userId = req.user.id;
  const tenantId = req.user.tenantId;

  if (!gameId || score == null) {
    return res.status(400).json({ status: 'error', message: 'gameId and score are required' });
  }

  try {
    // Upsert: only keep the highest score per user per game
    const existing = await prisma.gameScore.findFirst({
      where: { userId, gameId }
    });

    if (existing) {
      if (score > existing.score) {
        await prisma.gameScore.update({
          where: { id: existing.id },
          data: { score, updatedAt: new Date() }
        });
      }
    } else {
      await prisma.gameScore.create({
        data: { userId, tenantId, gameId, score }
      });
    }

    res.json({ status: 'success', message: 'Score submitted' });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit score' });
  }
};

exports.getLeaderboard = async (req, res) => {
  const { gameId, limit } = req.query;

  if (!gameId) {
    return res.status(400).json({ status: 'error', message: 'gameId is required' });
  }

  try {
    const scores = await prisma.gameScore.findMany({
      where: { gameId },
      orderBy: { score: 'desc' },
      take: parseInt(limit) || 10,
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    const data = scores.map((s, idx) => ({
      rank: idx + 1,
      userId: s.userId,
      userName: s.user?.name || 'Unknown',
      score: s.score,
      gameId: s.gameId
    }));

    res.json({ status: 'success', data });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch leaderboard' });
  }
};

exports.getMyHighScore = async (req, res) => {
  const { gameId } = req.query;
  const userId = req.user.id;

  if (!gameId) {
    return res.status(400).json({ status: 'error', message: 'gameId is required' });
  }

  try {
    const record = await prisma.gameScore.findFirst({
      where: { userId, gameId }
    });

    res.json({ status: 'success', data: { score: record?.score || 0 } });
  } catch (error) {
    console.error('My high score error:', error);
    res.status(500).json({ status: 'error', data: { score: 0 } });
  }
};

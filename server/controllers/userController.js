const User = require('../../config/db')

const getUserProfile = async (req, res) => {
    try {
        const userId = req.params.id;

        // 유저 정보 조회
        const userProfile = await User.findById(userId);

        if (!userProfile) {
            return res.status(404).json({ message: 'Users not found' });
        }
        res.status(200).json(userProfile);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const updateNickname = async (req, res) => {

};

module.exports = {
    getUserProfile,
    updateNickname,
};
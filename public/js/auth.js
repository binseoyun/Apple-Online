async function getMyUserId() {
    const storedUserId = sessionStorage.getItem('userId');
    if (storedUserId) {
        if (storedUserId !== 'undefined' && storedUserId !== 'null') {
            return storedUserId;
        }
    }

    try {
        const response = await fetch('/api/me');
        if (!response.ok) {
            window.location.href = '/login.html'
            return null;
        }
        const UserData = await response.json();

        sessionStorage.setItem('userId', UserData.id);

        console.log(`${UserData.id}, ${UserData.name}`)

        return UserData.id;
    } catch (error) {
        console.error('Error fetching user ID:', error);
        return null;
    }
}
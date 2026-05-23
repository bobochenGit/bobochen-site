// script.js

document.addEventListener('DOMContentLoaded', () => {
    // Init Custom Cursor
    initCustomCursor();

    // Init Particle Background
    initParticles();

    // Init Card Glow Effect
    initCardGlow();

    // Init Scroll Reveal
    initScrollReveal();
});

/* ==========================================================================
   Custom Glowing Cursor
   ========================================================================== */
function initCustomCursor() {
    const dot = document.createElement('div');
    const glow = document.createElement('div');
    
    dot.className = 'custom-cursor-dot';
    glow.className = 'custom-cursor-glow';
    
    document.body.appendChild(dot);
    document.body.appendChild(glow);

    let mouseX = 0, mouseY = 0;
    let dotX = 0, dotY = 0;
    let glowX = 0, glowY = 0;

    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // Smooth cursor trailing
    function animateCursor() {
        // Dot follows fast
        dotX += (mouseX - dotX) * 0.3;
        dotY += (mouseY - dotY) * 0.3;
        
        // Glow follows slower for organic motion
        glowX += (mouseX - glowX) * 0.12;
        glowY += (mouseY - glowY) * 0.12;

        dot.style.left = `${dotX}px`;
        dot.style.top = `${dotY}px`;
        
        glow.style.left = `${glowX}px`;
        glow.style.top = `${glowY}px`;

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Hover effects on interactive elements
    const interactiveElements = document.querySelectorAll('a, button, .card, video, .logo');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            dot.classList.add('cursor-hover');
            glow.classList.add('cursor-hover');
        });
        el.addEventListener('mouseleave', () => {
            dot.classList.remove('cursor-hover');
            glow.classList.remove('cursor-hover');
        });
    });
}

/* ==========================================================================
   Canvas Particles Background (Purple, Pink & Cyan)
   ========================================================================== */
function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particles-canvas';
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext('2d');
    let particles = [];
    const particleCount = 65;
    
    let mouse = {
        x: null,
        y: null,
        radius: 120
    };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    window.addEventListener('mouseleave', () => {
        mouse.x = null;
        mouse.y = null;
    });

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2.5 + 0.5;
            this.speedX = Math.random() * 0.6 - 0.3;
            this.speedY = Math.random() * 0.6 - 0.3;
            
            // Purple/Pink/Blue color palette
            const hues = [260, 275, 290, 310, 195]; // Purple, Violet, Pink, Light Cyan
            this.hue = hues[Math.floor(Math.random() * hues.length)];
            this.alpha = Math.random() * 0.5 + 0.25;
            this.direction = Math.random() > 0.5 ? 1 : -1;
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Boundary bounce
            if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
            if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;

            // Interaction with mouse (push away gently or attract)
            if (mouse.x != null && mouse.y != null) {
                let dx = mouse.x - this.x;
                let dy = mouse.y - this.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < mouse.radius) {
                    const force = (mouse.radius - distance) / mouse.radius;
                    this.x -= dx * force * 0.03;
                    this.y -= dy * force * 0.03;
                }
            }

            // Animate alpha for sparkle effect
            this.alpha += 0.005 * this.direction;
            if (this.alpha > 0.8 || this.alpha < 0.1) {
                this.direction *= -1;
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${this.hue}, 80%, 65%, ${this.alpha})`;
            ctx.shadowBlur = this.size * 2;
            ctx.shadowColor = `hsl(${this.hue}, 80%, 65%)`;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
        }
    }

    // Initialize particles array
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update & Draw Particles
        particles.forEach(particle => {
            particle.update();
            particle.draw();
        });

        // Draw connections
        drawConnections();

        requestAnimationFrame(animate);
    }

    function drawConnections() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                let dx = particles[i].x - particles[j].x;
                let dy = particles[i].y - particles[j].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 110) {
                    const alpha = (1 - (distance / 110)) * 0.12;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    // Use a gradient between the two particle colors or just violet
                    ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }
    }

    animate();
}

/* ==========================================================================
   Magnetic Spotlight Hover Effect for Cards
   ========================================================================== */
function initCardGlow() {
    const cards = document.querySelectorAll('.card, .video-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left; // x coordinate inside the card
            const y = e.clientY - rect.top;  // y coordinate inside the card
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
}

/* ==========================================================================
   Intersection Observer for Scroll Reveal
   ========================================================================== */
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-active');
                // Once it has animated, we can unobserve if we want a one-shot reveal
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
        observer.observe(el);
    });
}

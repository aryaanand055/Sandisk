`timescale 1ns / 1ps
module led_blinker_tb_pwr;
    reg clk;
    reg reset;
    wire led;

    led_blinker uut ( .clk(clk), .reset(reset), .led(led) );

    initial begin
        // Startup with reset HIGH
        reset = 1;
        clk = 0;
        #50 clk = 1; #50 clk = 0;
        #50 reset = 0;
        forever #10 clk = ~clk;
    end

    initial begin
        #1000 $finish;
    end
endmodule
